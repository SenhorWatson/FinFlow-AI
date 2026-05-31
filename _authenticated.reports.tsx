import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { listTransactions } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [{ title: "Relatórios — FinFlow AI" }],
  }),
  component: ReportsPage,
});

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ReportsPage() {
  const fetchTx = useServerFn(listTransactions);
  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });

  const txs = (data ?? []) as any[];
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Histórico de movimentações</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <ArrowUpRight className="mb-2 h-5 w-5 text-primary" />
          <p className="text-xs text-muted-foreground">Total Receitas</p>
          <p className="text-lg font-bold">{brl(income)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <ArrowDownRight className="mb-2 h-5 w-5 text-destructive" />
          <p className="text-xs text-muted-foreground">Total Despesas</p>
          <p className="text-lg font-bold">{brl(expense)}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Transações</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada por aqui ainda. Comece registrando algo no chat!</p>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === "income" ? "text-primary" : "text-destructive"}`}>
                  {tx.type === "income" ? "+" : "-"} {brl(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
