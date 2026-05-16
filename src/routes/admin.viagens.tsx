import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ChevronRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type TripStatus = Database["public"]["Enums"]["trip_status"];

const STATUS_LABEL: Record<TripStatus, string> = {
  quote_sent: "Orçamento",
  contract_signed: "Contrato",
  building: "Montando",
  delivered: "Entregue",
  in_progress: "Em viagem",
  completed: "Concluída",
};

const STATUS_COLOR: Record<TripStatus, string> = {
  quote_sent: "bg-muted text-muted-foreground",
  contract_signed: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  building: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  delivered: "bg-primary/10 text-primary",
  in_progress: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  completed: "bg-muted text-muted-foreground/70",
};

export const Route = createFileRoute("/admin/viagens")({
  component: ViagensShell,
});

function ViagensShell() {
  const childMatch = useMatch({ from: "/admin/viagens/$tripId", shouldThrow: false });
  return childMatch ? <Outlet /> : <TripsList />;
}

function TripsList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TripStatus | "all">("all");

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, status, destinations, start_date, end_date, visible_to_client, contact_id, contacts(full_name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (trips ?? []).filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Operação</p>
        <h1 className="font-display text-3xl font-light">Viagens</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Para criar uma viagem, abra um contato no CRM e clique em <strong>Nova viagem</strong>.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar pelo título" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as TripStatus | "all")}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-64" /> :
        filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            Nenhuma viagem por aqui.
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {filtered.map((t) => (
              <Link key={t.id} to="/admin/viagens/$tripId" params={{ tripId: t.id }}
                className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-2">
                    {t.contacts?.full_name ?? "—"}
                    {t.destinations?.length ? (
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{t.destinations.join(", ")}</span>
                    ) : null}
                  </p>
                </div>
                {t.start_date && (
                  <span className="hidden md:inline text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(t.start_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                  </span>
                )}
                {!t.visible_to_client && (
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    oculta
                  </span>
                )}
                <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Card>
        )}
    </div>
  );
}

export { STATUS_LABEL as TRIP_STATUS_LABEL, STATUS_COLOR as TRIP_STATUS_COLOR };
