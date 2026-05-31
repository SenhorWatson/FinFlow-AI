import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const chatInput = z.object({
  messages: z.array(messageSchema).min(1).max(40),
});

const SYSTEM_PROMPT = `Você é a Lumi, assistente financeira do FinFlow AI. Fala em português brasileiro, amigável, educativa e curta (1-3 frases).

Sua tarefa: ajudar usuários iniciantes a registrar receitas, despesas e metas conversando.

Regras:
- Quando o usuário descrever uma transação (gastei, paguei, recebi, ganhei), chame a ferramenta save_transaction.
- Quando descrever uma meta nova (juntar/economizar para algo), chame create_goal.
- Categorias válidas: alimentacao, transporte, moradia, lazer, saude, educacao, salario, investimento, outros.
- type = "expense" para gastos, "income" para receitas.
- Após salvar via ferramenta, confirme com emoji e dê uma dica curta.
- Se a mensagem for só conversa (oi, dúvida), responda sem chamar ferramenta.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "save_transaction",
      description: "Registra uma receita ou despesa do usuário.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number", description: "Valor em reais, positivo." },
          description: { type: "string", description: "Descrição curta." },
          category: {
            type: "string",
            enum: ["alimentacao", "transporte", "moradia", "lazer", "saude", "educacao", "salario", "investimento", "outros"],
          },
        },
        required: ["type", "amount", "description", "category"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Cria uma meta financeira para o usuário.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          target_amount: { type: "number" },
        },
        required: ["name", "target_amount"],
        additionalProperties: false,
      },
    },
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  alimentacao: "#10b981",
  transporte: "#3b82f6",
  moradia: "#f59e0b",
  lazer: "#ec4899",
  saude: "#ef4444",
  educacao: "#8b5cf6",
  salario: "#22c55e",
  investimento: "#06b6d4",
  outros: "#64748b",
};

async function ensureCategory(
  supabase: any,
  userId: string,
  name: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .or(`user_id.eq.${userId},is_default.eq.true`)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name,
      color: CATEGORY_COLORS[name] ?? "#64748b",
      is_default: false,
    })
    .select("id")
    .single();
  if (error) {
    console.error("category create error:", error.message);
    return null;
  }
  return created.id;
}

export const chatWithLumi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => chatInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const { supabase, userId } = context;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages,
        ],
        tools: TOOLS,
      }),
    });

    if (res.status === 429) throw new Error("Muitas requisições. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione saldo no workspace.");
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error:", res.status, t);
      throw new Error("Falha ao consultar IA");
    }

    const json = await res.json();
    const choice = json.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls ?? [];

    const created: Array<{ kind: "transaction" | "goal"; data: any }> = [];

    for (const call of toolCalls) {
      const name = call.function?.name;
      let args: any = {};
      try { args = JSON.parse(call.function?.arguments ?? "{}"); } catch { continue; }

      if (name === "save_transaction") {
        const categoryId = await ensureCategory(supabase, userId, args.category);
        const { data: tx, error } = await supabase
          .from("transactions")
          .insert({
            user_id: userId,
            type: args.type,
            amount: args.amount,
            description: args.description,
            category_id: categoryId,
          })
          .select("id, type, amount, description, category_id, date")
          .single();
        if (!error && tx) created.push({ kind: "transaction", data: { ...tx, category: args.category } });
        else if (error) console.error("tx insert err:", error.message);
      } else if (name === "create_goal") {
        const { data: g, error } = await supabase
          .from("goals")
          .insert({
            user_id: userId,
            name: args.name,
            target_amount: args.target_amount,
            current_amount: 0,
            color: "#10b981",
          })
          .select()
          .single();
        if (!error && g) created.push({ kind: "goal", data: g });
        else if (error) console.error("goal insert err:", error.message);
      }
    }

    let reply = choice?.content?.trim() ?? "";
    if (!reply && created.length > 0) {
      const t = created[0];
      if (t.kind === "transaction") {
        const verb = t.data.type === "income" ? "recebido" : "registrado";
        reply = `✅ ${verb}! R$ ${Number(t.data.amount).toFixed(2).replace(".", ",")} em ${t.data.category}.`;
      } else {
        reply = `🎯 Meta "${t.data.name}" criada! Vamos juntos.`;
      }
    }
    if (!reply) reply = "Pronto! Quer registrar mais alguma coisa?";

    return { reply, created };
  });
