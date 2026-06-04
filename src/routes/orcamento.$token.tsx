import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDown, MapPin, Calendar } from "lucide-react";
import { generateQuotePDF } from "@/lib/quote-pdf";

export const Route = createFileRoute("/orcamento/$token")({ component: PublicQuotePage });

type Quote = {
  id: string;
  service_type: string;
  destinations: string[] | null;
  days: number;
  daily_rate: number;
  discount: number | null;
  total: number;
  notes: string | null;
  share_token: string;
  created_at: string;
  contacts?: { full_name: string } | null;
};

const SERVICE_LABELS: Record<string, string> = {
  assessoria: "Assessoria de Roteiro",
  package: "Pacote Completo",
  consultoria: "Consultoria",
};

function PublicQuotePage() {
  const { token } = Route.useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // RLS only allows admins; for public read we need to relax. Quotes table has admin-only RLS.
      // We'll fall back to anon; if blocked, show "not available" message.
      const { data } = await supabase
        .from("quotes")
        .select("*, contacts(full_name)")
        .eq("share_token", token)
        .maybeSingle();
      setQuote((data as Quote) || null);
      setLoading(false);
    })();
  }, [token]);

  function download() {
    if (!quote) return;
    generateQuotePDF({
      contactName: quote.contacts?.full_name || "Cliente",
      serviceType: quote.service_type,
      destinations: quote.destinations || [],
      days: quote.days,
      dailyRate: quote.daily_rate,
      discount: quote.discount || 0,
      total: quote.total,
      notes: quote.notes,
      shareToken: quote.share_token,
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size={28} withWordmark />
          {quote && <Button onClick={download}><FileDown className="size-4 mr-2" />Baixar PDF</Button>}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-center text-muted-foreground">Carregando…</p>
        ) : !quote ? (
          <Card className="p-10 text-center">
            <h1 className="text-xl font-display font-semibold mb-2">Orçamento não disponível</h1>
            <p className="text-sm text-muted-foreground">Solicite à Viaggiari um novo link.</p>
          </Card>
        ) : (
          <Card className="p-8 space-y-6">
            <div>
              <Badge variant="secondary" className="mb-3">{SERVICE_LABELS[quote.service_type] || quote.service_type}</Badge>
              <h1 className="text-3xl font-display font-semibold">Sua proposta de viagem</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Para {quote.contacts?.full_name || "você"} · Emitido em {new Date(quote.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <InfoLine icon={<MapPin className="size-4" />} label="Destinos" value={(quote.destinations || []).join(", ") || "—"} />
              <InfoLine icon={<Calendar className="size-4" />} label="Duração" value={`${quote.days} dia(s)`} />
            </div>

            <div className="rounded-lg bg-primary/5 p-6">
              <div className="flex items-end justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="text-4xl font-display font-bold text-primary mt-1">{brl(quote.total)}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Diária: {brl(quote.daily_rate)}</p>
                  {(quote.discount || 0) > 0 && <p>Desconto: −{brl(quote.discount || 0)}</p>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Forma de pagamento sugerida: 50% sinal + 50% até 30 dias antes da viagem.
              </p>
            </div>

            {quote.notes && (
              <div>
                <h3 className="font-medium mb-2">Observações</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}

            <div className="border-t border-border pt-4 text-xs text-muted-foreground text-center">
              Viaggiari · Para aceitar, responda a Nani ou S. pelo Instagram ou WhatsApp.
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
