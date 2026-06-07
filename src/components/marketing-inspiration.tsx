import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Plus, RefreshCw, Sparkles, Trash2, Users, Image as ImageIcon, Video, Layers,
  TrendingUp, Heart, MessageCircle, ExternalLink, Lightbulb, ChevronDown, ChevronUp,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { confirmAction } from "@/lib/confirm";
import {
  addProfile, scrapeProfile, removeProfile, analyzeProfile,
  analyzeCrossTrends, convertIdeaToPost,
} from "@/lib/instagram.functions";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  profile_pic_url: string | null;
  followers: number | null;
  posts_count: number | null;
  niche_note: string | null;
  last_scraped_at: string | null;
  last_ai_summary: string | null;
  last_ai_summary_at: string | null;
  is_private: boolean | null;
};

type Post = {
  id: string;
  profile_id: string;
  posted_at: string | null;
  media_type: "photo" | "video" | "carousel" | "reel";
  caption: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  likes: number;
  comments: number;
};

type Idea = {
  id: string;
  profile_id: string | null;
  title: string;
  body: string;
  suggested_media_type: "photo" | "video" | "carousel" | "reel";
  suggested_networks: string[];
  is_cross_trend: boolean;
  used_post_id: string | null;
};

function nf(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function MediaIcon({ t }: { t: Post["media_type"] }) {
  if (t === "video" || t === "reel") return <Video className="size-3" />;
  if (t === "carousel") return <Layers className="size-3" />;
  return <ImageIcon className="size-3" />;
}

export function MarketingInspiration() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [convertIdea, setConvertIdea] = useState<Idea | null>(null);

  const addFn = useServerFn(addProfile);
  const scrapeFn = useServerFn(scrapeProfile);
  const removeFn = useServerFn(removeProfile);
  const analyzeFn = useServerFn(analyzeProfile);
  const trendsFn = useServerFn(analyzeCrossTrends);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["ig-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("instagram_profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ["ig-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("instagram_posts").select("*").order("posted_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });

  const { data: ideas = [] } = useQuery({
    queryKey: ["ig-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("instagram_ai_ideas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Idea[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["ig-profiles"] });
    qc.invalidateQueries({ queryKey: ["ig-posts"] });
    qc.invalidateQueries({ queryKey: ["ig-ideas"] });
  };

  const addMut = useMutation({
    mutationFn: (input: { username: string; niche_note?: string }) => addFn({ data: input }),
    onSuccess: () => { toast.success("Perfil adicionado e atualizado"); invalidateAll(); setAddOpen(false); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar"),
  });

  const scrapeMut = useMutation({
    mutationFn: (profileId: string) => scrapeFn({ data: { profileId } }),
    onSuccess: () => { toast.success("Perfil atualizado"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });

  const analyzeMut = useMutation({
    mutationFn: (profileId: string) => analyzeFn({ data: { profileId } }),
    onSuccess: () => { toast.success("Análise gerada pela IA"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message ?? "Erro na análise"),
  });

  const removeMut = useMutation({
    mutationFn: (profileId: string) => removeFn({ data: { profileId } }),
    onSuccess: () => { toast.success("Perfil removido"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const trendsMut = useMutation({
    mutationFn: () => trendsFn({}),
    onSuccess: () => { toast.success("Tendências cruzadas geradas"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message ?? "Erro nas tendências"),
  });

  const analyzedCount = profiles.filter((p) => p.last_ai_summary).length;
  const crossTrendIdeas = ideas.filter((i) => i.is_cross_trend);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="brand-title text-xs text-primary mb-1">Inspiração</p>
          <h2 className="font-display text-2xl font-light">Perfis monitorados</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o que perfis do seu nicho estão postando. Gere análises e ideias com IA.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => trendsMut.mutate()}
            disabled={analyzedCount < 3 || trendsMut.isPending}
          >
            <TrendingUp className="size-4" />
            {trendsMut.isPending ? "Analisando…" : "Tendências cruzadas"}
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Adicionar perfil
          </Button>
        </div>
      </div>

      {crossTrendIdeas.length > 0 && (
        <Card className="p-5 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="font-medium">Ideias a partir de tendências cruzadas</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {crossTrendIdeas.map((i) => (
              <IdeaCard key={i.id} idea={i} onUse={() => setConvertIdea(i)} />
            ))}
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : profiles.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Users className="size-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum perfil monitorado ainda.<br />Adicione um @ para começar.
          </p>
          <Button onClick={() => setAddOpen(true)}><Plus className="size-4" /> Adicionar perfil</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              posts={allPosts.filter((post) => post.profile_id === p.id)}
              ideas={ideas.filter((i) => i.profile_id === p.id)}
              onScrape={() => scrapeMut.mutate(p.id)}
              onAnalyze={() => analyzeMut.mutate(p.id)}
              onRemove={async () => {
                if (await confirmAction(`Remover @${p.username}?`, { confirmLabel: "Remover" })) removeMut.mutate(p.id);
              }}
              onUseIdea={(idea) => setConvertIdea(idea)}
              isScrapingThis={scrapeMut.isPending && scrapeMut.variables === p.id}
              isAnalyzingThis={analyzeMut.isPending && analyzeMut.variables === p.id}
            />
          ))}
        </div>
      )}

      <AddProfileDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={(v) => addMut.mutate(v)}
        loading={addMut.isPending}
      />

      <ConvertIdeaDialog
        idea={convertIdea}
        onOpenChange={(v) => !v && setConvertIdea(null)}
        onConverted={() => { setConvertIdea(null); invalidateAll(); }}
      />
    </div>
  );
}

function ProfileCard({
  profile, posts, ideas, onScrape, onAnalyze, onRemove, onUseIdea,
  isScrapingThis, isAnalyzingThis,
}: {
  profile: Profile;
  posts: Post[];
  ideas: Idea[];
  onScrape: () => void;
  onAnalyze: () => void;
  onRemove: () => void;
  onUseIdea: (idea: Idea) => void;
  isScrapingThis: boolean;
  isAnalyzingThis: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // posts/semana
  const datedPosts = posts.filter((p) => p.posted_at);
  let perWeek: number | null = null;
  if (datedPosts.length >= 2) {
    const first = parseISO(datedPosts[datedPosts.length - 1].posted_at!);
    const last = parseISO(datedPosts[0].posted_at!);
    const days = Math.max(1, differenceInDays(last, first));
    perWeek = (datedPosts.length / days) * 7;
  }

  const mix = posts.reduce(
    (acc, p) => {
      if (p.media_type === "reel" || p.media_type === "video") acc.video++;
      else if (p.media_type === "carousel") acc.carousel++;
      else acc.photo++;
      return acc;
    },
    { photo: 0, video: 0, carousel: 0 },
  );
  const total = Math.max(1, posts.length);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        {profile.profile_pic_url ? (
          <img src={profile.profile_pic_url} alt="" className="size-14 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="size-14 rounded-full bg-muted flex items-center justify-center"><Users className="size-5 text-muted-foreground" /></div>
        )}
        <div className="flex-1 min-w-0">
          <a
            href={`https://instagram.com/${profile.username}`}
            target="_blank" rel="noreferrer"
            className="font-medium hover:underline truncate flex items-center gap-1"
          >
            @{profile.username} <ExternalLink className="size-3 text-muted-foreground" />
          </a>
          {profile.display_name && <p className="text-xs text-muted-foreground truncate">{profile.display_name}</p>}
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{nf(profile.followers)}</strong> seguidores</span>
            {perWeek != null && <span><strong className="text-foreground">{perWeek.toFixed(1)}</strong>/sem</span>}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="size-4 text-destructive" /></Button>
      </div>

      {profile.niche_note && (
        <p className="px-4 pb-2 text-xs text-muted-foreground italic">{profile.niche_note}</p>
      )}

      {posts.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
            <div className="bg-primary" style={{ width: `${(mix.photo / total) * 100}%` }} />
            <div className="bg-accent" style={{ width: `${(mix.video / total) * 100}%` }} />
            <div className="bg-secondary" style={{ width: `${(mix.carousel / total) * 100}%` }} />
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><ImageIcon className="size-3" /> {mix.photo}</span>
            <span className="flex items-center gap-1"><Video className="size-3" /> {mix.video}</span>
            <span className="flex items-center gap-1"><Layers className="size-3" /> {mix.carousel}</span>
          </div>
        </div>
      )}

      <div className="px-4 pb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        {profile.last_scraped_at
          ? <>Atualizado {formatDistanceToNow(parseISO(profile.last_scraped_at), { locale: ptBR, addSuffix: true })}</>
          : "Nunca atualizado"}
      </div>

      <div className="px-4 pb-4 flex gap-2 flex-wrap border-t border-border pt-3">
        <Button size="sm" variant="outline" onClick={onScrape} disabled={isScrapingThis}>
          <RefreshCw className={cn("size-4", isScrapingThis && "animate-spin")} />
          {isScrapingThis ? "Atualizando…" : "Atualizar"}
        </Button>
        <Button size="sm" onClick={onAnalyze} disabled={isAnalyzingThis || posts.length === 0}>
          <Sparkles className="size-4" />
          {isAnalyzingThis ? "Analisando…" : profile.last_ai_summary ? "Re-analisar" : "Analisar com IA"}
        </Button>
        {(posts.length > 0 || profile.last_ai_summary) && (
          <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)} className="ml-auto">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? "Recolher" : "Detalhes"}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-4">
          {posts.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">Últimos posts</p>
              <div className="grid grid-cols-4 gap-1.5">
                {posts.slice(0, 12).map((p) => (
                  <a key={p.id} href={p.permalink ?? "#"} target="_blank" rel="noreferrer"
                    className="relative aspect-square rounded overflow-hidden bg-muted group">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : <div className="w-full h-full bg-muted" />}
                    <div className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5"><MediaIcon t={p.media_type} /></div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-white text-[10px] flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <span className="flex items-center gap-0.5"><Heart className="size-3" />{nf(p.likes)}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="size-3" />{nf(p.comments)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {profile.last_ai_summary && (
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1"><Sparkles className="size-3" /> Resumo de estilo</p>
              <div className="prose prose-sm max-w-none text-sm">
                <ReactMarkdown>{profile.last_ai_summary}</ReactMarkdown>
              </div>
            </div>
          )}

          {ideas.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1"><Lightbulb className="size-3" /> Ideias geradas</p>
              <div className="grid gap-2">
                {ideas.map((i) => <IdeaCard key={i.id} idea={i} onUse={() => onUseIdea(i)} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function IdeaCard({ idea, onUse }: { idea: Idea; onUse: () => void }) {
  return (
    <Card className="p-3 bg-background">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-medium text-sm">{idea.title}</p>
        <Badge variant="outline" className="text-[10px] shrink-0">{idea.suggested_media_type}</Badge>
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{idea.body}</p>
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex gap-1 flex-wrap">
          {idea.suggested_networks.map((n) => <Badge key={n} variant="secondary" className="text-[10px]">{n}</Badge>)}
        </div>
        <Button size="sm" variant="ghost" onClick={onUse} disabled={!!idea.used_post_id}>
          {idea.used_post_id ? "Já usada" : "Usar como postagem"}
        </Button>
      </div>
    </Card>
  );
}

function AddProfileDialog({
  open, onOpenChange, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v: { username: string; niche_note?: string }) => void;
  loading: boolean;
}) {
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    if (!username.trim()) return;
    onSubmit({ username: username.trim(), niche_note: note.trim() || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setUsername(""); setNote(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar perfil para monitorar</DialogTitle>
          <DialogDescription>
            Informe o @ do perfil público do Instagram. Vamos puxar os últimos 12 posts (~US$ 0,03 por atualização).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Username do Instagram</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@viaggiari.ag ou viaggiari.ag" />
          </div>
          <div>
            <Label>Nota interna (opcional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Por que esse perfil interessa? Nicho?" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading || !username.trim()}>
            {loading ? "Adicionando…" : "Adicionar e coletar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertIdeaDialog({
  idea, onOpenChange, onConverted,
}: {
  idea: Idea | null;
  onOpenChange: (v: boolean) => void;
  onConverted: () => void;
}) {
  const [publishAt, setPublishAt] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 24);
    return d.toISOString().slice(0, 16);
  });
  const convertFn = useServerFn(convertIdeaToPost);
  const mut = useMutation({
    mutationFn: (input: { ideaId: string; publishAt: string }) => convertFn({ data: input }),
    onSuccess: () => { toast.success("Postagem criada no cronograma"); onConverted(); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Dialog open={!!idea} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar ao cronograma</DialogTitle>
          <DialogDescription>{idea?.title}</DialogDescription>
        </DialogHeader>
        <div>
          <Label>Data e hora de publicação</Label>
          <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => idea && mut.mutate({ ideaId: idea.id, publishAt })}
            disabled={mut.isPending}
          >
            {mut.isPending ? "Criando…" : "Criar postagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
