import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plane, Train, Hotel, Ticket, File, Download, Calendar } from "lucide-react";
import { useMyTrip, type Document } from "@/hooks/use-my-trip";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/minha-viagem/documentos")({
  component: Documentos,
});

const CATEGORIES = {
  flight: { label: "Voos", icon: Plane },
  train: { label: "Trens", icon: Train },
  hotel: { label: "Hospedagem", icon: Hotel },
  ticket: { label: "Ingressos", icon: Ticket },
  other: { label: "Outros", icon: File },
} as const;

function Documentos() {
  const { data, loading } = useMyTrip();
  const [tab, setTab] = useState<"all" | keyof typeof CATEGORIES>("all");

  if (loading) return <Skeleton className="h-96 w-full" />;

  const docs = data?.documents ?? [];
  const filtered = tab === "all" ? docs : docs.filter((d) => d.category === tab);

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Documentos</p>
        <h1 className="font-display text-2xl md:text-3xl font-light">Voos, hotéis e ingressos</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{v.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground border-dashed">
              Nenhum documento {tab !== "all" ? "nesta categoria" : "disponível"} ainda.
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((d) => <DocCard key={d.id} doc={d} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocCard({ doc }: { doc: Document }) {
  const Cat = CATEGORIES[doc.category];
  const Icon = Cat.icon;
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("trip-documents")
      .createSignedUrl(doc.storage_path, 300);
    setLoading(false);
    if (error || !data) { toast.error("Não foi possível abrir o documento"); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{doc.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <span>{Cat.label}</span>
            {doc.event_date && (
              <>
                <span>•</span>
                <Calendar className="size-3" />
                <span>{new Date(doc.event_date).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </>
            )}
          </p>
          {doc.notes && <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>}
        </div>
        <Button size="sm" variant="ghost" onClick={open} disabled={loading}>
          <Download className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
