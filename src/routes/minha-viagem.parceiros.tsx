import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Partner = Database["public"]["Tables"]["partner_products"]["Row"];

export const Route = createFileRoute("/minha-viagem/parceiros")({
  component: ClientParceiros,
});

function ClientParceiros() {
  const [filter, setFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["client-partner-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_products")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Partner[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [data]);

  const visible = useMemo(() => {
    if (!filter) return data ?? [];
    return (data ?? []).filter((p) => p.category === filter);
  }, [data, filter]);

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Parceiros</p>
        <h1 className="font-display text-2xl md:text-3xl font-light">Indicações para sua viagem</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Lojas e produtos selecionados para deixar sua viagem ainda melhor.
        </p>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              !filter ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40",
            )}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                filter === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <ShoppingBag className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma indicação por aqui ainda. Em breve novidades!</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {visible.map((p) => (
            <a
              key={p.id}
              href={p.purchase_url}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <Card className="overflow-hidden transition-all group-hover:border-primary/40 group-hover:shadow-md">
                <div className="aspect-video bg-muted overflow-hidden">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.product_name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <ShoppingBag className="size-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">{p.store_name}</p>
                      <p className="font-display font-medium leading-tight">{p.product_name}</p>
                    </div>
                    {p.category && <Badge variant="secondary" className="shrink-0">{p.category}</Badge>}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                  <p className="text-xs text-primary inline-flex items-center gap-1 pt-1">
                    Ver na loja <ExternalLink className="size-3" />
                  </p>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
