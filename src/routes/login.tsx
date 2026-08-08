import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, roles, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Se o usuário já estava logado ao abrir /login, redireciona.
  useEffect(() => {
    if (loading || !user) return;
    if (roles.length === 0) return;
    navigate({ to: isAdmin ? "/admin" : "/minha-viagem" });
  }, [user, isAdmin, roles, loading, navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.session) {
      setSubmitting(false);
      toast.error(error?.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : (error?.message ?? "Falha ao entrar"));
      return;
    }
    // Navega imediatamente — não esperamos onAuthStateChange → loadRoles →
    // re-render → useEffect. Buscamos roles direto com o user recém logado.
    try {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const admin = (rolesData ?? []).some((r) => r.role === "admin");
      toast.success("Bem-vindo de volta!");
      navigate({ to: admin ? "/admin" : "/minha-viagem", replace: true });
    } catch {
      navigate({ to: "/minha-viagem", replace: true });
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div className="min-h-[100svh] flex flex-col bg-background">
      <main className="flex-1 flex items-center justify-center section-padding py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex justify-center mb-8">
            <Logo size={64} withWordmark />
          </Link>
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <h1 className="font-display text-2xl md:text-3xl font-light mb-1">Entrar</h1>
            <p className="text-sm text-muted-foreground mb-6">Acesse sua área de viagem.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="h-12 text-base" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-12 text-base" />
              </div>
              <Button type="submit" className="w-full h-12" disabled={submitting}>
                {submitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
          <p className="text-sm text-muted-foreground mt-6 text-center">
            Ainda não é cliente? <Link to="/interesse" className="text-primary hover:underline">Solicite contato</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

