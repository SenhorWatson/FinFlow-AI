import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { listTransactions, listGoals } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Visão Geral — FinFlow AI" },
      { name: "description", content: "Saldo, metas e resumo do mês." },
    ],
  }),
  component: DashboardPage,
});

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DashboardPage() {
  const fetchTx = useServerFn(listTransactions);
  const fetchGoals = useServerFn(listGoals);
  const txQ = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const goalsQ = useQuery({ queryKey: ["goals"], queryFn: () => fetchGoals() });

  const txs = txQ.data ?? [];
  const now = new Date();
  const monthly = txs.filter((t: any) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income = monthly.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expense = monthly.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const balance = income - expense;
  const saving = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  return (
    <div className="space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">Resumo do mês</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
          <Wallet className="mb-2 h-5 w-5 opacity-80" />
          <p className="text-xs opacity-80">Saldo</p>
          <p className="text-lg font-bold">{brl(balance)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <TrendingUp className="mb-2 h-5 w-5 text-primary" />
          <p className="text-xs text-muted-foreground">Receitas</p>
          <p className="text-lg font-bold text-foreground">{brl(income)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <TrendingDown className="mb-2 h-5 w-5 text-destructive" />
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="text-lg font-bold text-foreground">{brl(expense)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <LayoutDashboard className="mb-2 h-5 w-5 text-accent" />
          <p className="text-xs text-muted-foreground">Economia</p>
          <p className="text-lg font-bold text-foreground">{saving}%</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Metas em andamento</h2>
        {goalsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (goalsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma meta ainda. Peça à Lumi para criar uma!</p>
        ) : (
          <div className="space-y-3">
            {(goalsQ.data ?? []).slice(0, 3).map((g: any) => {
              const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
              return (
                <div key={g.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {brl(Number(g.current_amount))} de {brl(Number(g.target_amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
