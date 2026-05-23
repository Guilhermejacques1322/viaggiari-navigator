import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Users, Inbox, Plane, Wallet, ArrowRight, Download, FileText, TrendingUp,
  TrendingDown, Minus, AlertTriangle, CalendarDays, Target, MapPin,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  rangeFromPreset, previousRange, toISODate, formatRangeShort, pctChange,
  type DateRange, type PeriodPreset,
} from "@/lib/date-ranges";
import { exportToExcel, type Column } from "@/lib/export-xlsx";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const range = useMemo(
    () => rangeFromPreset(preset, customFrom && customTo ? { from: customFrom, to: customTo } : undefined),
    [preset, customFrom, customTo],
  );
  const prev = useMemo(() => previousRange(range), [range]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="brand-title text-xs text-primary mb-2">Painel</p>
          <h1 className="font-display text-3xl md:text-4xl font-light">Bem-vindas.</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Período: {range.label} ({formatRangeShort(range)})
          </p>
        </div>
        <PeriodSelector
          preset={preset} setPreset={setPreset}
          customFrom={customFrom} setCustomFrom={setCustomFrom}
          customTo={customTo} setCustomTo={setCustomTo}
        />
      </div>

      <MetricsRow range={range} prev={prev} />

      <AlertsPanel />

      <ChartsRow range={range} />

      <div className="grid lg:grid-cols-2 gap-6">
        <LeadsReport range={range} />
        <OpenQuotesReport />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RevenueReport range={range} />
        <UpcomingTripsReport />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <FunnelReport range={range} />
        <DestinationReport range={range} />
      </div>

      <UpcomingPaymentsReport />
    </div>
  );
}

/* ============================== PERIOD ============================== */

function PeriodSelector({
  preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo,
}: {
  preset: PeriodPreset;
  setPreset: (p: PeriodPreset) => void;
  customFrom: Date | undefined;
  setCustomFrom: (d: Date | undefined) => void;
  customTo: Date | undefined;
  setCustomTo: (d: Date | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this_month">Este mês</SelectItem>
          <SelectItem value="last_month">Mês passado</SelectItem>
          <SelectItem value="last_30">Últimos 30 dias</SelectItem>
          <SelectItem value="last_90">Últimos 90 dias</SelectItem>
          <SelectItem value="this_year">Este ano</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <>
          <DatePick value={customFrom} onChange={setCustomFrom} placeholder="De" />
          <DatePick value={customTo} onChange={setCustomTo} placeholder="Até" />
        </>
      )}
    </div>
  );
}

function DatePick({
  value, onChange, placeholder,
}: { value: Date | undefined; onChange: (d: Date | undefined) => void; placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 size-4" />
          {value ? format(value, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

/* ============================== METRICS ============================== */

async function fetchMetrics(range: DateRange, prev: DateRange) {
  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();
  const prevFromISO = prev.from.toISOString();
  const prevToISO = prev.to.toISOString();
  const fromDate = toISODate(range.from);
  const toDate = toISODate(range.to);
  const prevFromDate = toISODate(prev.from);
  const prevToDate = toISODate(prev.to);

  const [
    leadsCur, leadsPrev,
    quotesCur, quotesPrev,
    openQuotes, closedQuotesCur,
    paymentsCur, paymentsPrev,
    activeTrips, activeContacts,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", fromISO).lte("created_at", toISO),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", prevFromISO).lte("created_at", prevToISO),
    supabase.from("quotes").select("*", { count: "exact", head: true }).gte("created_at", fromISO).lte("created_at", toISO),
    supabase.from("quotes").select("*", { count: "exact", head: true }).gte("created_at", prevFromISO).lte("created_at", prevToISO),
    supabase.from("quotes").select("total", { count: "exact" }).in("status", ["sent", "follow_up"]),
    supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "closed").gte("created_at", fromISO).lte("created_at", toISO),
    supabase.from("payments").select("amount").eq("status", "paid").gte("paid_date", fromDate).lte("paid_date", toDate),
    supabase.from("payments").select("amount").eq("status", "paid").gte("paid_date", prevFromDate).lte("paid_date", prevToDate),
    supabase.from("trips").select("*", { count: "exact", head: true }).in("status", ["building", "delivered", "in_progress"]),
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("status", "active_client"),
  ]);

  const revenueCur = (paymentsCur.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const revenuePrev = (paymentsPrev.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const openTotal = (openQuotes.data ?? []).reduce((s, q) => s + Number(q.total), 0);
  const conv = (quotesCur.count ?? 0) > 0 ? ((closedQuotesCur.count ?? 0) / (quotesCur.count ?? 1)) * 100 : 0;
  const avgTicket = (closedQuotesCur.count ?? 0) > 0 ? revenueCur / (closedQuotesCur.count ?? 1) : 0;

  return {
    leads: { cur: leadsCur.count ?? 0, prev: leadsPrev.count ?? 0 },
    quotesSent: { cur: quotesCur.count ?? 0, prev: quotesPrev.count ?? 0 },
    openQuotes: { count: openQuotes.count ?? 0, total: openTotal },
    revenue: { cur: revenueCur, prev: revenuePrev },
    conversion: conv,
    avgTicket,
    activeTrips: activeTrips.count ?? 0,
    activeContacts: activeContacts.count ?? 0,
  };
}

function MetricsRow({ range, prev }: { range: DateRange; prev: DateRange }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-metrics", range.from, range.to],
    queryFn: () => fetchMetrics(range, prev),
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric label="Leads no período" value={data?.leads.cur} change={data ? pctChange(data.leads.cur, data.leads.prev) : null} icon={Inbox} loading={isLoading} />
      <Metric label="Orçamentos enviados" value={data?.quotesSent.cur} change={data ? pctChange(data.quotesSent.cur, data.quotesSent.prev) : null} icon={FileText} loading={isLoading} />
      <Metric label="Orçamentos em aberto" value={data?.openQuotes.count} sub={data ? formatBRL(data.openQuotes.total) : undefined} icon={FileText} loading={isLoading} />
      <Metric label="Taxa de conversão" value={data ? `${data.conversion.toFixed(1)}%` : undefined} icon={Target} loading={isLoading} />
      <Metric label="Receita no período" value={data ? formatBRL(data.revenue.cur) : undefined} change={data ? pctChange(data.revenue.cur, data.revenue.prev) : null} icon={Wallet} loading={isLoading} />
      <Metric label="Ticket médio" value={data ? formatBRL(data.avgTicket) : undefined} icon={TrendingUp} loading={isLoading} />
      <Metric label="Viagens em andamento" value={data?.activeTrips} icon={Plane} loading={isLoading} />
      <Metric label="Clientes ativos" value={data?.activeContacts} icon={Users} loading={isLoading} />
    </div>
  );
}

function Metric({
  label, value, sub, change, icon: Icon, loading,
}: {
  label: string; value?: number | string; sub?: string; change?: number | null;
  icon: typeof Users; loading: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs">{label}</p>
        <Icon className="size-4" />
      </div>
      {loading ? <Skeleton className="h-8 mt-3 w-20" /> : (
        <>
          <p className="font-display text-3xl font-light mt-2">{value ?? "—"}</p>
          <div className="flex items-center gap-2 mt-1">
            {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
            {change != null && <ChangeBadge value={change} />}
          </div>
        </>
      )}
    </Card>
  );
}

function ChangeBadge({ value }: { value: number }) {
  const positive = value > 0.5;
  const negative = value < -0.5;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const cls = positive ? "text-emerald-600" : negative ? "text-red-600" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", cls)}>
      <Icon className="size-3" /> {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* ============================== ALERTS ============================== */

async function fetchAlerts() {
  const today = toISODate(new Date());
  const in7 = toISODate(new Date(Date.now() + 7 * 86400000));
  const days7ago = new Date(Date.now() - 7 * 86400000).toISOString();

  const [stale, overdue, soon, pending] = await Promise.all([
    supabase.from("quotes").select("id", { count: "exact", head: true })
      .in("status", ["sent", "follow_up"]).lt("created_at", days7ago),
    supabase.from("payments").select("id", { count: "exact", head: true })
      .eq("status", "pending").lt("due_date", today),
    supabase.from("trips").select("id", { count: "exact", head: true })
      .gte("start_date", today).lte("start_date", in7),
    supabase.from("itinerary_activities").select("id", { count: "exact", head: true })
      .eq("client_response", "want").eq("in_preroteiro", true),
  ]);

  return {
    staleQuotes: stale.count ?? 0,
    overduePayments: overdue.count ?? 0,
    upcoming7d: soon.count ?? 0,
    pendingFavorites: pending.count ?? 0,
  };
}

function AlertsPanel() {
  const { data } = useQuery({ queryKey: ["dash-alerts"], queryFn: fetchAlerts });
  if (!data) return null;
  const items = [
    { n: data.staleQuotes, label: "orçamentos sem follow-up há +7 dias", to: "/admin/orcamentos" },
    { n: data.overduePayments, label: "pagamentos vencidos", to: "/admin/orcamentos" },
    { n: data.upcoming7d, label: "viagens nos próximos 7 dias", to: "/admin/viagens" },
    { n: data.pendingFavorites, label: "atividades favoritadas aguardando confirmação", to: "/admin/viagens" },
  ].filter((i) => i.n > 0);

  if (items.length === 0) return null;

  return (
    <Card className="p-4 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="size-4 text-amber-600" />
        <h2 className="font-display font-medium text-sm">Atenção</h2>
      </div>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="text-sm flex items-center justify-between gap-3">
            <span><strong className="text-amber-700 dark:text-amber-400">{i.n}</strong> {i.label}</span>
            <Link to={i.to} className="text-xs text-primary hover:underline">ver →</Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ============================== CHARTS ============================== */

async function fetchCharts(range: DateRange) {
  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();
  const fromDate = toISODate(range.from);
  const toDate = toISODate(range.to);

  const [payments, leads, quotes] = await Promise.all([
    supabase.from("payments").select("amount, paid_date").eq("status", "paid").gte("paid_date", fromDate).lte("paid_date", toDate),
    supabase.from("leads").select("destination, created_at").gte("created_at", fromISO).lte("created_at", toISO),
    supabase.from("quotes").select("status").gte("created_at", fromISO).lte("created_at", toISO),
  ]);

  const byDay = new Map<string, number>();
  (payments.data ?? []).forEach((p) => {
    const k = p.paid_date as string;
    byDay.set(k, (byDay.get(k) ?? 0) + Number(p.amount));
  });
  const revenueSeries = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({
    date: format(new Date(d), "dd/MM"),
    revenue: v,
  }));

  const bySource = new Map<string, number>();
  (leads.data ?? []).forEach((l) => {
    const k = (l.destination ?? "Outros").trim() || "Outros";
    bySource.set(k, (bySource.get(k) ?? 0) + 1);
  });
  const leadsByDest = Array.from(bySource.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const statusMap: Record<string, number> = {};
  (quotes.data ?? []).forEach((q) => {
    statusMap[q.status] = (statusMap[q.status] ?? 0) + 1;
  });
  const quotesStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  return { revenueSeries, leadsByDest, quotesStatus };
}

const PIE_COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

function ChartsRow({ range }: { range: DateRange }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-charts", range.from, range.to],
    queryFn: () => fetchCharts(range),
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-5 lg:col-span-2">
        <h2 className="font-display font-medium mb-3">Receita ao longo do tempo</h2>
        {isLoading ? <Skeleton className="h-56" /> : (data?.revenueSeries.length ?? 0) === 0 ?
          <Empty>Sem pagamentos no período.</Empty> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data!.revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <RTooltip formatter={(v: number) => formatBRL(v)} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="font-display font-medium mb-3">Status dos orçamentos</h2>
        {isLoading ? <Skeleton className="h-56" /> : (data?.quotesStatus.length ?? 0) === 0 ?
          <Empty>Sem orçamentos.</Empty> : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data!.quotesStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                {data!.quotesStatus.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <RTooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card className="p-5 lg:col-span-3">
        <h2 className="font-display font-medium mb-3">Top destinos (leads)</h2>
        {isLoading ? <Skeleton className="h-48" /> : (data?.leadsByDest.length ?? 0) === 0 ?
          <Empty>Sem dados.</Empty> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data!.leadsByDest}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <RTooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

/* ============================== REPORTS ============================== */

function ReportPanel({
  title, to, onExport, disabled, children,
}: {
  title: string; to?: string; onExport: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-display font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onExport} disabled={disabled} title="Exportar Excel">
            <Download className="size-4" />
          </Button>
          {to && (
            <Link to={to} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              Ver tudo <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}

/* ---------- Leads recentes ---------- */
type Lead = {
  id: string; full_name: string; email: string; phone: string;
  destination: string | null; travel_period: string | null; message: string | null;
  created_at: string;
};
function LeadsReport({ range }: { range: DateRange }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-leads", range.from, range.to],
    queryFn: async () => {
      const { data } = await supabase.from("leads")
        .select("id, full_name, email, phone, destination, travel_period, message, created_at")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .order("created_at", { ascending: false });
      return (data ?? []) as Lead[];
    },
  });

  const cols: Column<Lead>[] = [
    { header: "Nome", accessor: "full_name", width: 28 },
    { header: "Email", accessor: "email", width: 28 },
    { header: "Telefone", accessor: "phone", width: 18 },
    { header: "Destino", accessor: "destination", width: 22 },
    { header: "Período", accessor: "travel_period", width: 18 },
    { header: "Mensagem", accessor: "message", width: 40 },
    { header: "Data", accessor: (r) => format(new Date(r.created_at), "dd/MM/yyyy HH:mm"), width: 18 },
  ];

  return (
    <ReportPanel
      title="Leads recentes"
      to="/admin/leads"
      disabled={!data?.length}
      onExport={() => exportToExcel(`leads_${formatRangeShort(range)}`, data ?? [], cols, "Leads")}
    >
      {isLoading ? <Skeleton className="h-32" /> :
        data?.length === 0 ? <Empty>Nenhum lead no período.</Empty> :
        <ul className="divide-y divide-border">
          {data!.slice(0, 6).map((l) => (
            <li key={l.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{l.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {l.email}{l.destination && ` • ${l.destination}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(l.created_at), "dd/MM")}
              </span>
            </li>
          ))}
        </ul>
      }
    </ReportPanel>
  );
}

/* ---------- Orçamentos em aberto ---------- */
type OpenQuote = {
  id: string; total: number; status: string; created_at: string;
  destinations: string[] | null; follow_up_at: string | null;
  contacts: { full_name: string } | null;
};
function OpenQuotesReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-open-quotes"],
    queryFn: async () => {
      const { data } = await supabase.from("quotes")
        .select("id, total, status, created_at, destinations, follow_up_at, contacts(full_name)")
        .in("status", ["sent", "follow_up"])
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as OpenQuote[];
    },
  });

  const cols: Column<OpenQuote>[] = [
    { header: "Cliente", accessor: (r) => r.contacts?.full_name ?? "—", width: 28 },
    { header: "Destinos", accessor: (r) => (r.destinations ?? []).join(", "), width: 30 },
    { header: "Valor (BRL)", accessor: (r) => Number(r.total), width: 16 },
    { header: "Status", accessor: "status", width: 14 },
    { header: "Enviado em", accessor: (r) => format(new Date(r.created_at), "dd/MM/yyyy"), width: 14 },
    { header: "Dias em aberto", accessor: (r) => Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000), width: 14 },
    { header: "Follow-up", accessor: (r) => r.follow_up_at ? format(new Date(r.follow_up_at), "dd/MM/yyyy") : "", width: 14 },
  ];

  return (
    <ReportPanel
      title="Orçamentos em aberto"
      to="/admin/orcamentos"
      disabled={!data?.length}
      onExport={() => exportToExcel("orcamentos_em_aberto", data ?? [], cols, "Orçamentos")}
    >
      {isLoading ? <Skeleton className="h-32" /> :
        data?.length === 0 ? <Empty>Nenhum orçamento em aberto.</Empty> :
        <ul className="divide-y divide-border">
          {data!.slice(0, 6).map((q) => (
            <li key={q.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{q.contacts?.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(q.destinations ?? []).join(", ") || "—"}
                </p>
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{formatBRL(Number(q.total))}</span>
            </li>
          ))}
        </ul>
      }
    </ReportPanel>
  );
}

/* ---------- Receita detalhada ---------- */
type PaymentRow = {
  id: string; amount: number; installment: number; payment_method: string | null;
  paid_date: string | null; trip_id: string | null; quote_id: string | null;
  trips: { title: string; contacts: { full_name: string } | null } | null;
  quotes: { contacts: { full_name: string } | null } | null;
};
function RevenueReport({ range }: { range: DateRange }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-revenue", range.from, range.to],
    queryFn: async () => {
      const { data } = await supabase.from("payments")
        .select("id, amount, installment, payment_method, paid_date, trip_id, quote_id, trips(title, contacts(full_name)), quotes(contacts(full_name))")
        .eq("status", "paid")
        .gte("paid_date", toISODate(range.from))
        .lte("paid_date", toISODate(range.to))
        .order("paid_date", { ascending: false });
      return (data ?? []) as unknown as PaymentRow[];
    },
  });

  const total = (data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const cols: Column<PaymentRow>[] = [
    { header: "Data", accessor: (r) => r.paid_date ? format(new Date(r.paid_date), "dd/MM/yyyy") : "", width: 14 },
    { header: "Cliente", accessor: (r) => r.trips?.contacts?.full_name ?? r.quotes?.contacts?.full_name ?? "—", width: 28 },
    { header: "Viagem", accessor: (r) => r.trips?.title ?? "", width: 28 },
    { header: "Parcela", accessor: "installment", width: 10 },
    { header: "Valor (BRL)", accessor: (r) => Number(r.amount), width: 16 },
    { header: "Forma de pagamento", accessor: "payment_method", width: 20 },
  ];

  return (
    <ReportPanel
      title={`Receita do período · ${formatBRL(total)}`}
      disabled={!data?.length}
      onExport={() => exportToExcel(`receita_${formatRangeShort(range)}`, data ?? [], cols, "Receita")}
    >
      {isLoading ? <Skeleton className="h-32" /> :
        data?.length === 0 ? <Empty>Nenhum pagamento recebido.</Empty> :
        <ul className="divide-y divide-border">
          {data!.slice(0, 6).map((p) => (
            <li key={p.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {p.trips?.contacts?.full_name ?? p.quotes?.contacts?.full_name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.trips?.title ?? "Orçamento"} · parcela {p.installment}
                </p>
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{formatBRL(Number(p.amount))}</span>
            </li>
          ))}
        </ul>
      }
    </ReportPanel>
  );
}

/* ---------- Próximas viagens ---------- */
type TripRow = {
  id: string; title: string; status: string; total_value: number;
  destinations: string[] | null; start_date: string | null; end_date: string | null;
  contacts: { full_name: string } | null;
};
function UpcomingTripsReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-upcoming-trips"],
    queryFn: async () => {
      const { data } = await supabase.from("trips")
        .select("id, title, status, total_value, destinations, start_date, end_date, contacts(full_name)")
        .gte("start_date", toISODate(new Date()))
        .order("start_date").limit(30);
      return (data ?? []) as unknown as TripRow[];
    },
  });

  const cols: Column<TripRow>[] = [
    { header: "Título", accessor: "title", width: 28 },
    { header: "Cliente", accessor: (r) => r.contacts?.full_name ?? "—", width: 24 },
    { header: "Destinos", accessor: (r) => (r.destinations ?? []).join(", "), width: 30 },
    { header: "Início", accessor: (r) => r.start_date ? format(new Date(r.start_date), "dd/MM/yyyy") : "", width: 14 },
    { header: "Fim", accessor: (r) => r.end_date ? format(new Date(r.end_date), "dd/MM/yyyy") : "", width: 14 },
    { header: "Status", accessor: "status", width: 16 },
    { header: "Valor total (BRL)", accessor: (r) => Number(r.total_value ?? 0), width: 18 },
  ];

  return (
    <ReportPanel
      title="Próximas viagens"
      to="/admin/viagens"
      disabled={!data?.length}
      onExport={() => exportToExcel("proximas_viagens", data ?? [], cols, "Viagens")}
    >
      {isLoading ? <Skeleton className="h-32" /> :
        data?.length === 0 ? <Empty>Nenhuma viagem agendada.</Empty> :
        <ul className="divide-y divide-border">
          {data!.slice(0, 6).map((t) => (
            <li key={t.id} className="py-3 flex items-center justify-between gap-4">
              <Link to="/admin/viagens/$tripId" params={{ tripId: t.id }} className="min-w-0 flex-1 hover:text-primary">
                <p className="font-medium text-sm truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">
                  {t.contacts?.full_name ?? "—"} · {t.status.replace("_", " ")}
                </p>
              </Link>
              {t.start_date && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(t.start_date), "dd/MM")}
                </span>
              )}
            </li>
          ))}
        </ul>
      }
    </ReportPanel>
  );
}

/* ---------- Funil de conversão ---------- */
type FunnelRow = { etapa: string; quantidade: number; conversao: string };
function FunnelReport({ range }: { range: DateRange }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-funnel", range.from, range.to],
    queryFn: async () => {
      const fromISO = range.from.toISOString();
      const toISO = range.to.toISOString();
      const [leads, contacts, quotesSent, quotesClosed] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("contacts").select("*", { count: "exact", head: true }).gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("quotes").select("*", { count: "exact", head: true }).gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "closed").gte("created_at", fromISO).lte("created_at", toISO),
      ]);
      return {
        leads: leads.count ?? 0,
        contacts: contacts.count ?? 0,
        quotesSent: quotesSent.count ?? 0,
        quotesClosed: quotesClosed.count ?? 0,
      };
    },
  });

  const stages: FunnelRow[] = data ? [
    { etapa: "Leads", quantidade: data.leads, conversao: "100%" },
    { etapa: "Contatos qualificados", quantidade: data.contacts, conversao: pctStr(data.contacts, data.leads) },
    { etapa: "Orçamentos enviados", quantidade: data.quotesSent, conversao: pctStr(data.quotesSent, data.leads) },
    { etapa: "Fechados", quantidade: data.quotesClosed, conversao: pctStr(data.quotesClosed, data.leads) },
  ] : [];

  const cols: Column<FunnelRow>[] = [
    { header: "Etapa", accessor: "etapa", width: 28 },
    { header: "Quantidade", accessor: "quantidade", width: 14 },
    { header: "Conversão (vs leads)", accessor: "conversao", width: 22 },
  ];

  const max = Math.max(...stages.map((s) => s.quantidade), 1);

  return (
    <ReportPanel
      title="Funil de conversão"
      disabled={!stages.length}
      onExport={() => exportToExcel(`funil_${formatRangeShort(range)}`, stages, cols, "Funil")}
    >
      {isLoading ? <Skeleton className="h-32" /> :
        <ul className="space-y-3">
          {stages.map((s) => (
            <li key={s.etapa}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{s.etapa}</span>
                <span className="font-medium">{s.quantidade} <span className="text-muted-foreground text-xs">({s.conversao})</span></span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(s.quantidade / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      }
    </ReportPanel>
  );
}

function pctStr(v: number, base: number) {
  if (!base) return "—";
  return `${((v / base) * 100).toFixed(1)}%`;
}

/* ---------- Performance por destino ---------- */
type DestRow = { destino: string; leads: number; viagens: number; receita: number };
function DestinationReport({ range }: { range: DateRange }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-destinations", range.from, range.to],
    queryFn: async () => {
      const fromISO = range.from.toISOString();
      const toISO = range.to.toISOString();
      const fromDate = toISODate(range.from);
      const toDate = toISODate(range.to);

      const [leads, trips, payments] = await Promise.all([
        supabase.from("leads").select("destination").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("trips").select("id, destinations").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("payments").select("amount, trip_id, trips(destinations)").eq("status", "paid")
          .gte("paid_date", fromDate).lte("paid_date", toDate),
      ]);

      const map = new Map<string, DestRow>();
      const ensure = (d: string) => {
        const k = d.trim() || "—";
        if (!map.has(k)) map.set(k, { destino: k, leads: 0, viagens: 0, receita: 0 });
        return map.get(k)!;
      };
      (leads.data ?? []).forEach((l) => { if (l.destination) ensure(l.destination).leads++; });
      (trips.data ?? []).forEach((t) => (t.destinations ?? []).forEach((d) => ensure(d).viagens++));
      (payments.data ?? []).forEach((p) => {
        const dests = (p as unknown as { trips: { destinations: string[] | null } | null }).trips?.destinations ?? [];
        if (dests.length) {
          const share = Number(p.amount) / dests.length;
          dests.forEach((d) => { ensure(d).receita += share; });
        }
      });
      return Array.from(map.values()).sort((a, b) => b.receita - a.receita || b.leads - a.leads);
    },
  });

  const cols: Column<DestRow>[] = [
    { header: "Destino", accessor: "destino", width: 28 },
    { header: "Leads", accessor: "leads", width: 12 },
    { header: "Viagens", accessor: "viagens", width: 12 },
    { header: "Receita (BRL)", accessor: (r) => Math.round(r.receita), width: 18 },
  ];

  return (
    <ReportPanel
      title="Performance por destino"
      disabled={!data?.length}
      onExport={() => exportToExcel(`destinos_${formatRangeShort(range)}`, data ?? [], cols, "Destinos")}
    >
      {isLoading ? <Skeleton className="h-32" /> :
        data?.length === 0 ? <Empty>Sem dados.</Empty> :
        <ul className="divide-y divide-border">
          {data!.slice(0, 6).map((d) => (
            <li key={d.destino} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate">{d.destino}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
                <span>{d.leads}L</span>
                <span>{d.viagens}V</span>
                <span className="font-medium text-foreground">{formatBRL(d.receita)}</span>
              </div>
            </li>
          ))}
        </ul>
      }
    </ReportPanel>
  );
}

/* ---------- Próximos pagamentos a vencer ---------- */
type DuePayment = {
  id: string; amount: number; due_date: string | null; installment: number;
  trips: { title: string; contacts: { full_name: string } | null } | null;
  quotes: { contacts: { full_name: string } | null } | null;
};
function UpcomingPaymentsReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-due-payments"],
    queryFn: async () => {
      const today = toISODate(new Date());
      const in30 = toISODate(new Date(Date.now() + 30 * 86400000));
      const { data } = await supabase.from("payments")
        .select("id, amount, due_date, installment, trips(title, contacts(full_name)), quotes(contacts(full_name))")
        .eq("status", "pending")
        .gte("due_date", today).lte("due_date", in30)
        .order("due_date");
      return (data ?? []) as unknown as DuePayment[];
    },
  });

  const total = (data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const cols: Column<DuePayment>[] = [
    { header: "Vencimento", accessor: (r) => r.due_date ? format(new Date(r.due_date), "dd/MM/yyyy") : "", width: 14 },
    { header: "Cliente", accessor: (r) => r.trips?.contacts?.full_name ?? r.quotes?.contacts?.full_name ?? "—", width: 28 },
    { header: "Viagem", accessor: (r) => r.trips?.title ?? "", width: 28 },
    { header: "Parcela", accessor: "installment", width: 10 },
    { header: "Valor (BRL)", accessor: (r) => Number(r.amount), width: 16 },
  ];

  return (
    <ReportPanel
      title={`Pagamentos a vencer (30 dias) · ${formatBRL(total)}`}
      disabled={!data?.length}
      onExport={() => exportToExcel("pagamentos_a_vencer_30d", data ?? [], cols, "Pagamentos")}
    >
      {isLoading ? <Skeleton className="h-32" /> :
        data?.length === 0 ? <Empty>Nenhum pagamento pendente nos próximos 30 dias.</Empty> :
        <ul className="divide-y divide-border">
          {data!.slice(0, 8).map((p) => (
            <li key={p.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.trips?.contacts?.full_name ?? p.quotes?.contacts?.full_name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.trips?.title ?? "Orçamento"} · parcela {p.installment} · {p.due_date && format(new Date(p.due_date), "dd/MM")}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{formatBRL(Number(p.amount))}</span>
            </li>
          ))}
        </ul>
      }
    </ReportPanel>
  );
}

/* ============================== UTIL ============================== */

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
