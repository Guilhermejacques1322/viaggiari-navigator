import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard, Users, Plane, Inbox, LogOut, Menu, MapPin, FileText, Bell, ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminShell,
});

type NavItem = { to: string; label: string; icon: typeof Users; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/leads", label: "Leads", icon: Inbox },
  { to: "/admin/crm", label: "CRM", icon: Users },
  { to: "/admin/viagens", label: "Viagens", icon: Plane },
  { to: "/admin/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/admin/destinos", label: "Destinos", icon: MapPin },
  { to: "/admin/parceiros", label: "Parceiros", icon: ShoppingBag },
  { to: "/admin/notificacoes", label: "Notificações", icon: Bell },
];

function AdminShell() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/minha-viagem" });
  }, [user, isAdmin, loading, navigate]);

  // Boot inicial apenas — depois mantemos o Outlet montado para não
  // perder estado da página em refresh de token em background.
  if (loading && !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }
  if (!user || !isAdmin) return null;


  return (
    <div className="min-h-screen flex bg-background">
      <DesktopSidebar onSignOut={signOut} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onSignOut={signOut} />
        <main className="flex-1 px-5 md:px-10 py-6 md:py-10 max-w-7xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DesktopSidebar({ onSignOut }: { onSignOut: () => void }) {
  const { pathname } = useLocation();
  return (
    <aside className="hidden md:flex w-60 bg-sidebar text-sidebar-foreground flex-col p-5 sticky top-0 h-screen">
      <Logo size={28} withWordmark />
      <nav className="mt-10 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={onSignOut}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
      >
        <LogOut className="size-4" />
        Sair
      </button>
    </aside>
  );
}

function MobileHeader({ onSignOut }: { onSignOut: () => void }) {
  const { pathname } = useLocation();
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-border bg-background/95 backdrop-blur">
      <Logo size={26} withWordmark />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon"><Menu className="size-5" /></Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-64 bg-sidebar text-sidebar-foreground">
          <nav className="mt-8 space-y-1">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70",
                )}>
                  <Icon className="size-4" /> {item.label}
                </Link>
              );
            })}
            <button onClick={onSignOut}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70">
              <LogOut className="size-4" /> Sair
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
