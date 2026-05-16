import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminArea,
});

function AdminArea() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/minha-viagem" });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 bg-sidebar text-sidebar-foreground flex-col p-6">
        <Logo size={32} withWordmark />
        <nav className="mt-12 space-y-2 text-sm">
          <div className="px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-accent-foreground">Dashboard</div>
          <div className="px-3 py-2 text-sidebar-foreground/60">CRM (em breve)</div>
          <div className="px-3 py-2 text-sidebar-foreground/60">Viagens (em breve)</div>
          <div className="px-3 py-2 text-sidebar-foreground/60">Financeiro (em breve)</div>
        </nav>
      </aside>
      <main className="flex-1 section-padding py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="brand-title text-xs text-primary mb-2">Painel</p>
            <h1 className="font-display text-3xl md:text-4xl font-light">Bem-vindas.</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {["Clientes ativos", "Leads", "Viagens em andamento", "Receita do mês"].map((m) => (
            <div key={m} className="bg-surface border border-border rounded-xl p-6">
              <p className="text-xs text-muted-foreground">{m}</p>
              <p className="font-display text-3xl font-light mt-2">—</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          CRM, editor de roteiro, financeiro e demais módulos chegam nas próximas fases.
        </div>
      </main>
    </div>
  );
}
