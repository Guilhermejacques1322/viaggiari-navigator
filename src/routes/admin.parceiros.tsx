import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Edit2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type Partner = Database["public"]["Tables"]["partner_products"]["Row"];

export const Route = createFileRoute("/admin/parceiros")({
  component: AdminParceiros,
});

const EMPTY: Partial<Partner> = {
  store_name: "", product_name: "", purchase_url: "",
  image_url: "", description: "", category: "", display_order: 0, active: true,
};

function AdminParceiros() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Partner> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-partner-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_products")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Partner[];
    },
    refetchOnWindowFocus: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-partner-products"] });

  const save = useMutation({
    mutationFn: async (p: Partial<Partner>) => {
      if (!p.store_name?.trim() || !p.product_name?.trim() || !p.purchase_url?.trim()) {
        throw new Error("Loja, produto e link são obrigatórios");
      }
      const payload = {
        store_name: p.store_name.trim(),
        product_name: p.product_name.trim(),
        purchase_url: p.purchase_url.trim(),
        image_url: p.image_url?.trim() || null,
        description: p.description?.trim() || null,
        category: p.category?.trim() || null,
        display_order: p.display_order ?? 0,
        active: p.active ?? true,
      };
      if (p.id) {
        const { error } = await supabase.from("partner_products").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { setEditing(null); invalidate(); toast.success("Salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = async (p: Partner) => {
    const { error } = await supabase.from("partner_products").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const remove = async (p: Partner) => {
    if (!confirm(`Excluir "${p.product_name}"?`)) return;
    const { error } = await supabase.from("partner_products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="brand-title text-xs text-primary mb-2">Parceiros</p>
          <h1 className="font-display text-2xl md:text-3xl">Vitrine de parceiros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Produtos e lojas recomendados que aparecem para os clientes.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="size-4" /> Novo parceiro
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.length ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          Nenhum parceiro cadastrado ainda.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <Card key={p.id} className={p.active ? "" : "opacity-60"}>
              <div className="aspect-video bg-muted rounded-t-xl overflow-hidden">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.product_name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">sem imagem</div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{p.store_name}</p>
                    <p className="font-medium truncate">{p.product_name}</p>
                  </div>
                  {p.category && <Badge variant="secondary" className="shrink-0">{p.category}</Badge>}
                </div>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <a href={p.purchase_url} target="_blank" rel="noreferrer"
                     className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="size-3" /> Abrir link
                  </a>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(p)} title={p.active ? "Desativar" : "Ativar"}>
                      {p.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Edit2 className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar parceiro" : "Novo parceiro"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nome da loja *</Label>
                <Input value={editing.store_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, store_name: e.target.value })} />
              </div>
              <div>
                <Label>Nome do produto *</Label>
                <Input value={editing.product_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, product_name: e.target.value })} />
              </div>
              <div>
                <Label>Link de compra *</Label>
                <Input type="url" placeholder="https://..." value={editing.purchase_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, purchase_url: e.target.value })} />
              </div>
              <div>
                <Label>URL da imagem</Label>
                <Input type="url" placeholder="https://..." value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
                {editing.image_url && (
                  <div className="mt-2 aspect-video bg-muted rounded-md overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editing.image_url} alt="preview" className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
              <div>
                <Label>Categoria</Label>
                <Input placeholder="Ex: Mala, Eletrônico, Seguro…" value={editing.category ?? ""}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </div>
              <div>
                <Label>Descrição curta</Label>
                <Textarea rows={2} value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={editing.display_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) || 0 })} />
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={editing.active ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                  <Label>Ativo</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
