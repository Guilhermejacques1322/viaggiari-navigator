import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, FileText, ListChecks, Plane } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMyTrip } from "@/hooks/use-my-trip";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/minha-viagem/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data, loading } = useMyTrip();

  if (loading) return <DashboardSkeleton />;

  const firstName = user?.email?.split("@")[0] ?? "viajante";

  if (!data?.trip) {
    return (
      <div>
        <p className="brand-title text-xs text-primary mb-3">Minha viagem</p>
        <h1 className="font-display text-3xl md:text-4xl font-light">Olá, {firstName}.</h1>
        <Card className="mt-8 p-10 text-center border-dashed">
          <Plane className="size-10 mx-auto text-primary/40 mb-4" />
          <p className="font-display text-lg">Nenhuma viagem liberada ainda</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Quando a Nani liberar seu acesso, sua viagem aparece aqui com roteiro, documentos e ingressos.
          </p>
        </Card>
      </div>
    );
  }

  const { trip, days, documents, payments } = data;
  const daysToGo = trip.start_date
    ? Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / 86_400_000)
    : null;

  const pendingPreroteiro = days
    .flatMap((d) => d.activities)
    .filter((a) => a.in_preroteiro && !a.client_response).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Sua viagem</p>
        <h1 className="font-display text-3xl md:text-4xl font-light">{trip.title}</h1>
        {trip.destinations && trip.destinations.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {trip.destinations.join(" • ")}
          </p>
        )}
      </div>

      {daysToGo !== null && daysToGo >= 0 && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <p className="brand-title text-xs text-primary">Contagem regressiva</p>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="font-display text-5xl md:text-6xl font-light text-primary">{daysToGo}</span>
            <span className="font-display text-sm text-muted-foreground">
              {daysToGo === 1 ? "dia para embarcar" : daysToGo === 0 ? "É hoje!" : "dias para embarcar"}
            </span>
          </div>
          {trip.start_date && (
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatDate(trip.start_date)}
              {trip.end_date && ` — ${formatDate(trip.end_date)}`}
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard to="/minha-viagem/roteiro" icon={Calendar} label="Dias de roteiro" value={days.length} />
        <StatCard to="/minha-viagem/documentos" icon={FileText} label="Documentos" value={documents.length} />
        {trip.preroteiro_mode && (
          <StatCard
            to="/minha-viagem/preroteiro"
            icon={ListChecks}
            label="Para você decidir"
            value={pendingPreroteiro}
            highlight={pendingPreroteiro > 0}
          />
        )}
        {payments.length > 0 && (
          <StatCard
            to="/minha-viagem"
            icon={Plane}
            label="Pagamentos"
            value={`${payments.filter((p) => p.status === "paid").length}/${payments.length}`}
          />
        )}
      </div>

      {days.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-medium mb-3">Próximos dias</h2>
          <div className="space-y-2">
            {days.slice(0, 3).map((d) => (
              <Link
                key={d.id}
                to="/minha-viagem/roteiro"
                className="block p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 grid place-items-center text-primary font-display text-sm font-medium">
                    {d.day_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.title ?? `Dia ${d.day_number}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.activities.length} {d.activities.length === 1 ? "atividade" : "atividades"}
                      {d.date && ` • ${formatDate(d.date)}`}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  to, icon: Icon, label, value, highlight,
}: { to: string; icon: typeof Calendar; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className={`block p-4 rounded-lg border transition-colors ${
        highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border hover:border-primary/40"
      }`}
    >
      <Icon className={`size-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <p className="mt-2 font-display text-2xl font-light">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" /><Skeleton className="h-24" />
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
