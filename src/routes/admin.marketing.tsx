import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Plus, Image as ImageIcon, Video, Check, Pencil, Trash2, Calendar, CheckCircle2,
  Instagram, Facebook, Linkedin, Youtube, Music2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/marketing")({
  component: MarketingPage,
});

type MediaType = "photo" | "video";
type PostStatus = "scheduled" | "done";

type Post = {
  id: string;
  title: string;
  media_type: MediaType;
  media_url: string | null;
  media_notes: string | null;
  caption: string | null;
  networks: string[];
  publish_at: string;
  status: PostStatus;
  done_at: string | null;
};

const NETWORKS: { value: string; label: string; icon: typeof Instagram }[] = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "tiktok", label: "TikTok", icon: Music2 },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "youtube", label: "YouTube", icon: Youtube },
];

function networkMeta(value: string) {
  return NETWORKS.find((n) => n.value === value);
}

function MarketingPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Post | null>(null);
  const [open, setOpen] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["marketing-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_posts")
        .select("*")
        .order("publish_at", { ascending: true });
      if (error) throw error;
      return data as Post[];
    },
  });

  const toggleDone = useMutation({
    mutationFn: async (p: Post) => {
      const next: PostStatus = p.status === "done" ? "scheduled" : "done";
      const { error } = await supabase
        .from("marketing_posts")
        .update({ status: next, done_at: next === "done" ? new Date().toISOString() : null })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketing-posts"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-posts"] });
      toast.success("Postagem excluída");
    },
  });

  const groups = useMemo(() => {
    const upcoming: Post[] = [];
    const late: Post[] = [];
    const done: Post[] = [];
    for (const p of posts) {
      if (p.status === "done") done.push(p);
      else if (isPast(parseISO(p.publish_at)) && !isToday(parseISO(p.publish_at))) late.push(p);
      else upcoming.push(p);
    }
    return { upcoming, late, done };
  }, [posts]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(p: Post) {
    setEditing(p);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="brand-title text-xs text-primary mb-1">Marketing</p>
          <h1 className="font-display text-3xl font-light">Cronograma de postagens</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planeje, organize e acompanhe o que vai ao ar nas redes.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nova postagem
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Programadas" value={groups.upcoming.length} tone="default" />
        <StatCard label="Atrasadas" value={groups.late.length} tone="warn" />
        <StatCard label="Publicadas" value={groups.done.length} tone="success" />
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Programadas ({groups.upcoming.length})</TabsTrigger>
          <TabsTrigger value="late">Atrasadas ({groups.late.length})</TabsTrigger>
          <TabsTrigger value="done">Publicadas ({groups.done.length})</TabsTrigger>
        </TabsList>

        {(["upcoming", "late", "done"] as const).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : groups[key].length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <Calendar className="size-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {groups[key].map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onToggleDone={() => toggleDone.mutate(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={() => {
                      if (confirm("Excluir esta postagem?")) remove.mutate(p.id);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <PostDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["marketing-posts"] })}
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "default" | "warn" | "success" }) {
  const toneCls =
    tone === "warn" ? "border-amber-500/30 bg-amber-500/5"
    : tone === "success" ? "border-emerald-500/30 bg-emerald-500/5"
    : "";
  return (
    <Card className={cn("p-4", toneCls)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-light mt-1">{value}</p>
    </Card>
  );
}

function PostCard({
  post, onToggleDone, onEdit, onDelete,
}: { post: Post; onToggleDone: () => void; onEdit: () => void; onDelete: () => void }) {
  const date = parseISO(post.publish_at);
  const overdue = post.status !== "done" && isPast(date) && !isToday(date);
  const isDone = post.status === "done";

  return (
    <Card className={cn(
      "p-4 flex flex-col gap-3 transition-colors",
      isDone && "opacity-70",
      overdue && "border-amber-500/40",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {post.media_type === "video" ? (
            <Video className="size-4 text-primary shrink-0" />
          ) : (
            <ImageIcon className="size-4 text-primary shrink-0" />
          )}
          <p className={cn(
            "font-medium text-sm truncate",
            isDone && "line-through text-muted-foreground",
          )}>
            {post.title}
          </p>
        </div>
        {isDone && <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {post.networks.map((n) => {
          const meta = networkMeta(n);
          if (!meta) return <Badge key={n} variant="outline">{n}</Badge>;
          const Icon = meta.icon;
          return (
            <Badge key={n} variant="outline" className="gap-1">
              <Icon className="size-3" /> {meta.label}
            </Badge>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Calendar className="size-3" />
        {format(date, "EEE, dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
        {overdue && <span className="text-amber-600 font-medium ml-1">• atrasada</span>}
      </div>

      {post.caption && (
        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{post.caption}</p>
      )}
      {post.media_notes && (
        <p className="text-xs text-muted-foreground/80 italic line-clamp-2">Mídia: {post.media_notes}</p>
      )}
      {post.media_url && (
        <a href={post.media_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate">
          Ver mídia
        </a>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button
          size="sm"
          variant={isDone ? "outline" : "default"}
          onClick={onToggleDone}
          className="flex-1"
        >
          <Check className="size-4" /> {isDone ? "Reabrir" : "Marcar publicada"}
        </Button>
        <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="size-4" /></Button>
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="size-4 text-destructive" /></Button>
      </div>
    </Card>
  );
}

function PostDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Post | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("photo");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaNotes, setMediaNotes] = useState("");
  const [caption, setCaption] = useState("");
  const [networks, setNetworks] = useState<string[]>([]);
  const [publishAt, setPublishAt] = useState("");
  const [saving, setSaving] = useState(false);

  // initialize when opening
  useMemoInit(open, () => {
    if (editing) {
      setTitle(editing.title);
      setMediaType(editing.media_type);
      setMediaUrl(editing.media_url ?? "");
      setMediaNotes(editing.media_notes ?? "");
      setCaption(editing.caption ?? "");
      setNetworks(editing.networks ?? []);
      setPublishAt(editing.publish_at.slice(0, 16));
    } else {
      setTitle("");
      setMediaType("photo");
      setMediaUrl("");
      setMediaNotes("");
      setCaption("");
      setNetworks([]);
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + 1);
      setPublishAt(d.toISOString().slice(0, 16));
    }
  });

  function toggleNet(v: string) {
    setNetworks((n) => (n.includes(v) ? n.filter((x) => x !== v) : [...n, v]));
  }

  async function handleSave() {
    if (!title.trim()) return toast.error("Informe um título");
    if (networks.length === 0) return toast.error("Escolha ao menos uma rede social");
    if (!publishAt) return toast.error("Defina a data e hora de publicação");

    setSaving(true);
    const payload = {
      title: title.trim(),
      media_type: mediaType,
      media_url: mediaUrl.trim() || null,
      media_notes: mediaNotes.trim() || null,
      caption: caption.trim() || null,
      networks,
      publish_at: new Date(publishAt).toISOString(),
    };
    const { error } = editing
      ? await supabase.from("marketing_posts").update(payload).eq("id", editing.id)
      : await supabase.from("marketing_posts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Postagem atualizada" : "Postagem criada");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar postagem" : "Nova postagem"}</DialogTitle>
          <DialogDescription>
            Defina a mídia, legenda, redes e quando essa postagem deve ir ao ar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título interno</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Carrossel Paris primavera"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de mídia</Label>
              <Select value={mediaType} onValueChange={(v) => setMediaType(v as MediaType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Foto</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data e hora</Label>
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Link da mídia (opcional)</Label>
            <Input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
            />
          </div>

          <div>
            <Label>Conteúdo da mídia</Label>
            <Textarea
              value={mediaNotes}
              onChange={(e) => setMediaNotes(e.target.value)}
              placeholder="Descreva o que aparece na foto/vídeo, roteiro, cortes…"
              rows={3}
            />
          </div>

          <div>
            <Label>Legenda</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Texto da publicação, hashtags, CTA…"
              rows={4}
            />
          </div>

          <div>
            <Label>Redes sociais</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {NETWORKS.map((n) => {
                const Icon = n.icon;
                const checked = networks.includes(n.value);
                return (
                  <label
                    key={n.value}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                      checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleNet(n.value)} />
                    <Icon className="size-4" />
                    <span className="text-sm">{n.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : editing ? "Salvar" : "Criar postagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// runs init effect only when "open" transitions to true
function useMemoInit(open: boolean, fn: () => void) {
  const [last, setLast] = useState(false);
  if (open && !last) {
    setLast(true);
    fn();
  } else if (!open && last) {
    setLast(false);
  }
}
