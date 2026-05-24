import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, FileDown, Link2, Trash2, Bell, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { generateQuotePDF } from "@/lib/quote-pdf";
import { confirmAction } from "@/lib/confirm";

export const Route = createFileRoute("/admin/orcamentos")({ component: OrcamentosPage });

type QuoteStatus = "sent" | "follow_up" | "lost" | "closed";
type Contact = { id: string; full_name: string };
type Quote = {
  id: string;
  contact_id: string | null;
  service_type: string;
  destinations: string[] | null;
  days: number;
  daily_rate: number;
  discount: number | null;
  total: number;
  notes: string | null;
  share_token: string | null;
  created_at: string;
  status: QuoteStatus;
  lost_reason: string | null;
  follow_up_at: string | null;
  closed_at: string | null;
  contacts?: { full_name: string } | null;
};
type Payment = {
  id: string;
  quote_id: string | null;
  installment: number;
  amount: number;
  status: "pending" | "paid" | "overdue";
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
};

const STATUS_LABEL: Record<QuoteStatus, string> = {
  sent: "Enviado",
  follow_up: "Follow-up",
  lost: "Cliente desistiu",
  closed: "Fechado",
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  sent: "bg-sky-500/10 text-sky-700",
  follow_up: "bg-amber-500/10 text-amber-700 border border-amber-500/40",
  lost: "bg-muted text-muted-foreground",
  closed: "bg-emerald-500/10 text-emerald-700",
};

function OrcamentosPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contact_id: "", service_type: "assessoria", destinations: "",
    days: 7, daily_rate: 500, discount: 0, notes: "",
  });

  async function load() {
    setLoading(true);
    const [{ data: qs }, { data: cs }] = await Promise.all([
      supabase.from("quotes").select("*, contacts(full_name)").order("created_at", { ascending: false }),
      supabase.from("contacts").select("id, full_name").order("full_name"),
    ]);
    setQuotes((qs as Quote[]) || []);
    setContacts(cs || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const total = useMemo(() => Math.max(0, form.days * form.daily_rate - form.discount), [form]);

  async function createQuote() {
    if (!form.contact_id) return toast.error("Selecione um cliente");
    const destinations = form.destinations.split(",").map((s) => s.trim()).filter(Boolean);
    const { data, error } = await supabase.from("quotes").insert({
      contact_id: form.contact_id,
      service_type: form.service_type as any,
      destinations, days: form.days, daily_rate: form.daily_rate,
      discount: form.discount, total, notes: form.notes || null,
    }).select("*, contacts(full_name)").single();
    if (error || !data) return toast.error(error?.message || "Erro");
    toast.success("Orçamento criado");
    setOpen(false);
    setForm({ contact_id: "", service_type: "assessoria", destinations: "", days: 7, daily_rate: 500, discount: 0, notes: "" });
    load();
    downloadPDF(data as Quote);
  }

  async function downloadPDF(q: Quote) {
    await generateQuotePDF({
      contactName: q.contacts?.full_name || "Cliente",
      serviceType: q.service_type,
      destinations: q.destinations || [],
      days: q.days, dailyRate: q.daily_rate,
      discount: q.discount || 0, total: q.total,
      notes: q.notes, shareToken: q.share_token || "",
    });
  }

  const open_ = quotes.filter((q) => q.status === "sent" || q.status === "follow_up");
  const lost = quotes.filter((q) => q.status === "lost");
  const closed = quotes.filter((q) => q.status === "closed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Gestão de propostas e financeiro</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-2" />Novo orçamento</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo orçamento</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div><Label>Cliente *</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Tipo de serviço</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assessoria">Assessoria de roteiro</SelectItem>
                    <SelectItem value="package">Pacote completo</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Destinos (separados por vírgula)</Label>
                <Input value={form.destinations} onChange={(e) => setForm({ ...form, destinations: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Dias</Label><Input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: +e.target.value })} /></div>
                <div><Label>Diária (R$)</Label><Input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: +e.target.value })} /></div>
                <div><Label>Desconto (R$)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value })} /></div>
              </div>
              <div className="rounded-md bg-muted p-3 text-sm flex justify-between items-center">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-lg text-primary">{brl(total)}</span>
              </div>
              <div><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={createQuote} className="w-full">Criar e baixar PDF</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-muted-foreground">Carregando…</p> : (
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Em aberto ({open_.length})</TabsTrigger>
            <TabsTrigger value="closed">Fechados ({closed.length})</TabsTrigger>
            <TabsTrigger value="lost">Desistiram ({lost.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-4 space-y-3">
            {open_.length === 0 ? <Empty /> : open_.map((q) => (
              <QuoteCard key={q.id} q={q} onChanged={load} onDownload={() => downloadPDF(q)} />
            ))}
          </TabsContent>

          <TabsContent value="closed" className="mt-4 space-y-4">
            <ClosedReport quotes={closed} />
            {closed.length === 0 ? <Empty /> : closed.map((q) => (
              <QuoteCard key={q.id} q={q} onChanged={load} onDownload={() => downloadPDF(q)} showFinance />
            ))}
          </TabsContent>

          <TabsContent value="lost" className="mt-4 space-y-3">
            {lost.length === 0 ? <Empty /> : lost.map((q) => (
              <QuoteCard key={q.id} q={q} onChanged={load} onDownload={() => downloadPDF(q)} />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Empty() {
  return <Card className="p-10 text-center text-muted-foreground">Nada por aqui.</Card>;
}

function QuoteCard({ q, onChanged, onDownload, showFinance }: {
  q: Quote; onChanged: () => void; onDownload: () => void; showFinance?: boolean;
}) {
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState(q.lost_reason ?? "");
  const [financeOpen, setFinanceOpen] = useState(false);

  async function changeStatus(status: QuoteStatus) {
    if (status === "lost") { setLostOpen(true); return; }
    const patch: any = { status };
    if (status === "closed") patch.closed_at = new Date().toISOString();
    if (status === "follow_up") patch.follow_up_at = new Date().toISOString();
    const { error } = await supabase.from("quotes").update(patch).eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    onChanged();
  }

  async function confirmLost() {
    const { error } = await supabase.from("quotes").update({
      status: "lost", lost_reason: lostReason || null,
    }).eq("id", q.id);
    if (error) return toast.error(error.message);
    setLostOpen(false);
    toast.success("Registrado");
    onChanged();
  }

  async function copyLink() {
    if (!q.share_token) return;
    await navigator.clipboard.writeText(`${window.location.origin}/orcamento/${q.share_token}`);
    toast.success("Link copiado");
  }

  async function deleteQuote() {
    if (!confirm("Excluir orçamento?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    onChanged();
  }

  return (
    <Card className={`p-4 ${q.status === "follow_up" ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium">{q.contacts?.full_name || "Sem cliente"}</h3>
            <Badge variant="outline" className="text-xs">{q.service_type}</Badge>
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${STATUS_COLOR[q.status]}`}>
              {q.status === "follow_up" && <Bell className="inline size-3 mr-1" />}
              {STATUS_LABEL[q.status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {(q.destinations || []).join(", ") || "—"} · {q.days} dias · {new Date(q.created_at).toLocaleDateString("pt-BR")}
          </p>
          {q.status === "lost" && q.lost_reason && (
            <p className="text-xs text-muted-foreground mt-1 italic">Motivo: {q.lost_reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-primary">{brl(q.total)}</span>
          <Select value={q.status} onValueChange={(v) => changeStatus(v as QuoteStatus)}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="follow_up">Fazer follow-up</SelectItem>
              <SelectItem value="closed">Fechado</SelectItem>
              <SelectItem value="lost">Cliente desistiu</SelectItem>
            </SelectContent>
          </Select>
          {showFinance && (
            <Button size="sm" variant="outline" onClick={() => setFinanceOpen((v) => !v)}>
              <DollarSign className="size-4" />Financeiro
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={copyLink}><Link2 className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={onDownload}><FileDown className="size-4 mr-1" />PDF</Button>
          <Button size="sm" variant="ghost" onClick={deleteQuote}><Trash2 className="size-4" /></Button>
        </div>
      </div>

      {showFinance && financeOpen && <QuoteFinance quoteId={q.id} total={q.total} />}

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Por que o cliente desistiu?</DialogTitle></DialogHeader>
          <Textarea rows={4} placeholder="Anote o motivo para CRM futuro (preço, data, mudou de ideia...)" value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLostOpen(false)}>Cancelar</Button>
            <Button onClick={confirmLost}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function QuoteFinance({ quoteId, total }: { quoteId: string; total: number }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ amount: 0, due_date: "", payment_method: "pix", notes: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("payments").select("*").eq("quote_id", quoteId).order("installment");
    setPayments((data as Payment[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [quoteId]);

  async function add() {
    if (!form.amount) return toast.error("Informe o valor");
    const installment = (payments.at(-1)?.installment ?? 0) + 1;
    const { error } = await supabase.from("payments").insert({
      quote_id: quoteId, installment, amount: form.amount,
      due_date: form.due_date || null, payment_method: form.payment_method,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    setAdding(false);
    setForm({ amount: 0, due_date: "", payment_method: "pix", notes: "" });
    load();
  }

  async function togglePaid(p: Payment) {
    const { error } = await supabase.from("payments").update({
      status: p.status === "paid" ? "pending" : "paid",
      paid_date: p.status === "paid" ? null : new Date().toISOString().slice(0, 10),
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(id: string) {
    await supabase.from("payments").delete().eq("id", id);
    load();
  }

  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalReg = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="mt-4 border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm">
          <span className="text-muted-foreground">Recebido:</span> <strong className="text-emerald-700">{brl(paid)}</strong>
          <span className="text-muted-foreground"> / Total registrado: {brl(totalReg)}</span>
          <span className="text-muted-foreground"> · Orçamento: {brl(total)}</span>
        </p>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-4" />Parcela
        </Button>
      </div>

      {adding && (
        <div className="rounded-md border border-border p-3 grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
          <div><Label className="text-xs">Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          <div><Label className="text-xs">Forma</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={add}>Adicionar</Button>
        </div>
      )}

      {loading ? <p className="text-xs text-muted-foreground">Carregando…</p> :
        payments.length === 0 ? <p className="text-xs text-muted-foreground italic">Nenhuma parcela. Adicione conforme combinado com o cliente (à vista, 50/50, etc.)</p> : (
        <ul className="divide-y divide-border text-sm">
          {payments.map((p) => (
            <li key={p.id} className="py-2 flex items-center gap-3 flex-wrap">
              <span className="font-display w-8">#{p.installment}</span>
              <div className="flex-1 min-w-[120px]">
                <p className="font-medium">{brl(Number(p.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  {p.payment_method ?? "—"}
                  {p.due_date && ` · Vence ${new Date(p.due_date).toLocaleDateString("pt-BR")}`}
                  {p.paid_date && ` · Pago ${new Date(p.paid_date).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <Button size="sm" variant={p.status === "paid" ? "default" : "outline"} onClick={() => togglePaid(p)}>
                {p.status === "paid" ? "Pago" : "Marcar pago"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClosedReport({ quotes }: { quotes: Quote[] }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  useEffect(() => {
    const ids = quotes.map((q) => q.id);
    if (!ids.length) { setPayments([]); return; }
    supabase.from("payments").select("*").in("quote_id", ids)
      .then(({ data }) => setPayments((data as Payment[]) || []));
  }, [quotes.map((q) => q.id).join(",")]);

  const faturado = quotes.reduce((s, q) => s + Number(q.total), 0);
  const recebido = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const ticket = quotes.length ? faturado / quotes.length : 0;
  const methods: Record<string, number> = {};
  payments.filter((p) => p.status === "paid").forEach((p) => {
    methods[p.payment_method ?? "—"] = (methods[p.payment_method ?? "—"] ?? 0) + 1;
  });
  const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Clientes fechados" value={String(quotes.length)} />
      <Stat label="Faturado" value={brl(faturado)} />
      <Stat label="Recebido" value={brl(recebido)} />
      <Stat label="Ticket médio" value={brl(ticket)} />
      <div className="col-span-2 md:col-span-4 text-xs text-muted-foreground">
        Forma de pagamento mais usada: <strong className="text-foreground">{topMethod}</strong>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg">{value}</p>
    </div>
  );
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
