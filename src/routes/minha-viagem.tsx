import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Map as MapIcon, FileText, ListChecks, LogOut, ShoppingBag, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MyTripProvider, useMyTrip } from "@/hooks/use-my-trip";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/minha-viagem")({
  component: ClientShell,
});

function ClientShell() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Só mostra tela de carregamento no boot inicial (quando ainda não
  // temos usuário). Uma vez logado, nunca mais desmontamos a árvore —
  // refresh de token em background não deve perder estado da página.
  if (loading && !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }
  if (!user) return null;


  return (
    <MyTripProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between px-5 py-3 md:px-12">
            <Link to="/minha-viagem"><Logo size={28} withWordmark /></Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12 md:pl-64">
          <DesktopSideNav />
          <div className="max-w-3xl mx-auto px-4 py-5 md:px-10 md:py-10">
            <Outlet />
          </div>
        </main>


        <MobileBottomNav />
      </div>
    </MyTripProvider>
  );
}

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/minha-viagem", label: "Início", icon: Home, exact: true },
  { to: "/minha-viagem/roteiro", label: "Roteiro", icon: MapIcon },
  { to: "/minha-viagem/mapa", label: "Mapa", icon: MapIcon },
  { to: "/minha-viagem/utilidades", label: "Utilidades", icon: Wrench },
  { to: "/minha-viagem/documentos", label: "Docs", icon: FileText },
  { to: "/minha-viagem/preroteiro", label: "Pré", icon: ListChecks },
  { to: "/minha-viagem/parceiros", label: "Parceiros", icon: ShoppingBag },
];

function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-7">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-0.5 pt-2 pb-2 text-[9px] font-medium leading-tight tracking-tight uppercase text-center",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid place-items-center size-8 rounded-full transition-colors",
                    active ? "bg-primary/10" : "bg-transparent",
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span className="w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


function DesktopSideNav() {
  const { pathname } = useLocation();
  const { data } = useMyTrip();
  return (
    <aside className="hidden md:flex fixed left-0 top-[57px] bottom-0 w-64 border-r border-border bg-surface flex-col p-4">
      {data?.trip && (
        <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="brand-title text-[10px] text-primary">Sua viagem</p>
          <p className="font-display text-sm font-medium mt-1 truncate">{data.trip.title}</p>
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
