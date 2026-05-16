import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Inbox, Plane, Wallet, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

async function fetchDashboard() {
  const [
    { count: leadsCount },
    { count: contactsCount },
    { count: activeTripsCount },
    { data: recentLeads },
    { data: upcomingTrips },
    { data: paidPayments },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("status", "active_client"),
    supabase.from("trips").select("*", { count: "exact", head: true })
      .in("status", ["building", "delivered", "in_progress"]),
    supabase.from("leads").select("id, full_name, email, destination, created_at")
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("trips").select("id, title, start_date, status")
      .gte("start_date", new Date().toISOString().slice(0, 10))
      .order("start_date").limit(5),
    supabase.from("payments").select("amount, paid_date")
      .eq("status", "paid")
      .gte("paid_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
  ]);

  const monthRevenue = (paidPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return {
    leadsCount: leadsCount ?? 0,
    contactsCount: contactsCount ?? 0,
    activeTripsCount: activeTripsCount ?? 0,
    monthRevenue,
    recentLeads: recentLeads ?? [],
    upcomingTrips: upcomingTrips ?? [],
  };
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-dash"], queryFn: fetchDashboard });

  return (
    <div className="space-y-8">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Painel</p>
        <h1 className="font-display text-3xl md:text-4xl font-light">Bem-vindas.</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Leads novos" value={data?.leadsCount} icon={Inbox} loading={isLoading} />
        <Metric label="Clientes ativos" value={data?.contactsCount} icon={Users} loading={isLoading} />
        <Metric label="Viagens em andamento" value={data?.activeTripsCount} icon={Plane} loading={isLoading} />
        <Metric label="Receita do mês" value={data ? formatBRL(data.monthRevenue) : undefined} icon={Wallet} loading={isLoading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Leads recentes" to="/admin/leads">
          {isLoading ? <Skeleton className="h-32" /> :
            data?.recentLeads.length === 0 ? <Empty>Nenhum lead ainda.</Empty> :
            <ul className="divide-y divide-border">
              {data?.recentLeads.map((l) => (
                <li key={l.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{l.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {l.email} {l.destination && `• ${l.destination}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(l.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          }
        </Panel>

        <Panel title="Próximas viagens" to="/admin/viagens">
          {isLoading ? <Skeleton className="h-32" /> :
            data?.upcomingTrips.length === 0 ? <Empty>Nenhuma viagem agendada.</Empty> :
            <ul className="divide-y divide-border">
              {data?.upcomingTrips.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <Link to="/admin/viagens/$tripId" params={{ tripId: t.id }} className="min-w-0 flex-1 hover:text-primary">
                    <p className="font-medium text-sm truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.status.replace("_", " ")}</p>
                  </Link>
                  {t.start_date && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.start_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          }
        </Panel>
      </div>
    </div>
  );
}

function Metric({
  label, value, icon: Icon, loading,
}: { label: string; value?: number | string; icon: typeof Users; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs">{label}</p>
        <Icon className="size-4" />
      </div>
      {loading ? <Skeleton className="h-8 mt-3 w-16" /> :
        <p className="font-display text-3xl font-light mt-2">{value ?? "—"}</p>}
    </Card>
  );
}

function Panel({ title, to, children }: { title: string; to: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-medium">{title}</h2>
        <Link to={to} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Ver tudo <ArrowRight className="size-3" />
        </Link>
      </div>
      {children}
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `${days}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
