import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Ajustes — FinFlow AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else navigate({ to: "/login", replace: true });
  };

  const name = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Usuário";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Personalize sua experiência</p>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conta</h2>
        <div className="space-y-1 rounded-2xl border border-border bg-card p-2">
          <div className="flex w-full items-center gap-3 rounded-xl px-3 py-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Perfil</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted"
          >
            <LogOut className="h-5 w-5 text-destructive" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-destructive">Sair</p>
              <p className="text-xs text-muted-foreground">Encerrar sessão</p>
            </div>
          </button>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">FinFlow AI v1.0 — NovaBridge Labs</p>
    </div>
  );
}
