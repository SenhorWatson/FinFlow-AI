import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Target, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { listGoals, createGoal } from "@/lib/finance.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Metas — FinFlow AI" }] }),
  component: GoalsPage,
});

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function GoalsPage() {
  const fetchGoals = useServerFn(listGoals);
  const create = useServerFn(createGoal);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["goals"], queryFn: () => fetchGoals() });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const mut = useMutation({
    mutationFn: (vars: { name: string; target_amount: number }) =>
      create({ data: { ...vars, current_amount: 0 } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      setOpen(false);
      setName(""); setTarget("");
      toast.success("Meta criada!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = parseFloat(target.replace(",", "."));
    if (!name.trim() || !t || t <= 0) return;
    mut.mutate({ name: name.trim(), target_amount: t });
  };

  return (
    <div className="space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Metas</h1>
          <p className="text-sm text-muted-foreground">Seus objetivos financeiros</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Sem metas ainda. Crie uma ou peça à Lumi: "Quero juntar R$ 3000 para uma viagem".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((g: any) => {
            const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
            return (
              <div key={g.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{g.name}</h3>
                    {g.deadline && (
                      <p className="text-xs text-muted-foreground">{new Date(g.deadline).toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{pct}% concluído</span>
                  <span className="text-xs font-medium">
                    {brl(Number(g.current_amount))} / {brl(Number(g.target_amount))}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Nova meta</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input
                placeholder="Ex: Viagem para o litoral"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                inputMode="decimal"
                placeholder="Valor alvo (R$)"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={mut.isPending}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {mut.isPending ? "Salvando..." : "Criar meta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
