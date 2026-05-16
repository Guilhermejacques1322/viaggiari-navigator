import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Map as MapIcon, FileText, Heart, ListChecks, LogOut } from "lucide-react";
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

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }

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

        <main className="flex-1 pb-24 md:pb-12 md:pl-64">
          <DesktopSideNav />
          <div className="max-w-3xl mx-auto px-5 py-6 md:px-10 md:py-10">
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
  { to: "/minha-viagem/documentos", label: "Docs", icon: FileText },
  { to: "/minha-viagem/preroteiro", label: "Pré-roteiro", icon: ListChecks },
  { to: "/minha-viagem/parceiros", label: "Parceiros", icon: Heart },
];

function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <ul className="grid grid-cols-5">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide uppercase",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
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
