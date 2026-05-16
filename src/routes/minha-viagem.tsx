import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/minha-viagem")({
  component: ClientArea,
});

function ClientArea() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="section-padding border-b border-border py-4 flex items-center justify-between">
        <Link to="/"><Logo size={32} withWordmark /></Link>
        <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
      </header>
      <main className="section-padding py-12 max-w-3xl mx-auto">
        <p className="brand-title text-xs text-primary mb-3">Minha viagem</p>
        <h1 className="font-display text-3xl md:text-4xl font-light">Olá, {user.email?.split("@")[0]}.</h1>
        <p className="mt-4 text-muted-foreground">
          Sua área de viagem está sendo preparada. Em breve você verá aqui seu roteiro dia a dia,
          documentos, ingressos e indicações dos nossos parceiros.
        </p>
        <div className="mt-12 rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Nenhuma viagem liberada ainda. Quando a Nani liberar seu acesso, ela aparece aqui.
        </div>
      </main>
    </div>
  );
}
