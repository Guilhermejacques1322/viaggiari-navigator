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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileDown, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateQuotePDF } from "@/lib/quote-pdf";

export const Route = createFileRoute("/admin/orcamentos")({ component: OrcamentosPage });

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
  contacts?: { full_name: string } | null;
};

function OrcamentosPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contact_id: "",
    service_type: "roteiro_personalizado",
    destinations: "",
    days: 7,
    daily_rate: 500,
    discount: 0,
    notes: "",
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

  const total = useMemo(() => {
    const subtotal = form.days * form.daily_rate;
    return Math.max(0, subtotal - form.discount);
  }, [form.days, form.daily_rate, form.discount]);

  async function createQuote() {
    if (!form.contact_id) return toast.error("Selecione um cliente");
    const destinations = form.destinations.split(",").map((s) => s.trim()).filter(Boolean);
    const { data, error } = await supabase.from("quotes").insert({
      contact_id: form.contact_id,
      service_type: form.service_type as "roteiro_personalizado" | "aluguel_carro" | "hospedagem" | "pacote_completo" | "consultoria",
      destinations,
      days: form.days,
      daily_rate: form.daily_rate,
      discount: form.discount,
      total,
      notes: form.notes || null,
    }).select("*, contacts(full_name)").single();
    if (error || !data) return toast.error(error?.message || "Erro");
    toast.success("Orçamento criado");
    setOpen(false);
    setForm({ contact_id: "", service_type: "roteiro_personalizado", destinations: "", days: 7, daily_rate: 500, discount: 0, notes: "" });
    load();
    // immediate PDF
    const q = data as Quote;
    generateQuotePDF({
      contactName: q.contacts?.full_name || "Cliente",
      serviceType: q.service_type,
      destinations: q.destinations || [],
      days: q.days,
      dailyRate: q.daily_rate,
      discount: q.discount || 0,
      total: q.total,
      notes: q.notes,
      shareToken: q.share_token || "",
    });
  }

  function downloadPDF(q: Quote) {
    generateQuotePDF({
      contactName: q.contacts?.full_name || "Cliente",
      serviceType: q.service_type,
      destinations: q.destinations || [],
      days: q.days,
      dailyRate: q.daily_rate,
      discount: q.discount || 0,
      total: q.total,
      notes: q.notes,
      shareToken: q.share_token || "",
    });
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/orcamento/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  async function deleteQuote(id: string) {
    if (!confirm("Excluir orçamento?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Gere PDF e link compartilhável</p>
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
                    <SelectItem value="roteiro_personalizado">Roteiro personalizado</SelectItem>
                    <SelectItem value="aluguel_carro">Aluguel de carro</SelectItem>
                    <SelectItem value="hospedagem">Hospedagem</SelectItem>
                    <SelectItem value="pacote_completo">Pacote completo</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Destinos (separados por vírgula)</Label>
                <Input value={form.destinations} onChange={(e) => setForm({ ...form, destinations: e.target.value })} placeholder="Roma, Florença" />
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

      {loading ? <p className="text-muted-foreground">Carregando…</p> : quotes.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum orçamento ainda.</Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <Card key={q.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{q.contacts?.full_name || "Sem cliente"}</h3>
                  <Badge variant="outline" className="text-xs">{q.service_type.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(q.destinations || []).join(", ") || "—"} · {q.days} dias · {new Date(q.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-primary">{brl(q.total)}</span>
                <Button size="sm" variant="ghost" onClick={() => copyLink(q.share_token!)}><Link2 className="size-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => downloadPDF(q)}><FileDown className="size-4 mr-1" />PDF</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteQuote(q.id)}><Trash2 className="size-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
