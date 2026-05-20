import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plane, Compass, MapPin, Sparkles, ShieldCheck, Heart, Instagram, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import heroImg from "@/assets/hero-travel.jpg";
import romeImg from "@/assets/destination-rome.jpg";
import lisbonImg from "@/assets/destination-lisbon.jpg";
import nordesteImg from "@/assets/destination-nordeste.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      // Avisa o browser para já baixar a hero em paralelo ao HTML (melhora LCP)
      { rel: "preload", as: "image", href: heroImg, fetchPriority: "high" },
    ],
  }),
  component: LandingPage,
});

const leadSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(8, "Informe um WhatsApp válido").max(30),
  destination: z.string().trim().max(200).optional(),
  travel_period: z.string().trim().max(50).optional(),
  service_interest: z.array(z.string()).max(4),
  message: z.string().trim().max(500).optional(),
});

const services = ["Pacote", "Assessoria", "Consultoria", "Ainda não sei"];

const destinations = [
  { name: "Roma", img: romeImg, days: "7 dias", price: "R$ 49", featured: true },
  { name: "Lisboa", img: lisbonImg, days: "6 dias", price: "R$ 49", featured: false },
  { name: "Nordeste Brasileiro", img: nordesteImg, days: "8 dias", price: "R$ 39", featured: false },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <PreReadyItineraries />
      <WhyViaggiari />
      <LeadSection />
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="section-padding flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center"><Logo size={36} withWordmark /></Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#servicos" className="text-muted-foreground hover:text-foreground transition">Como funciona</a>
          <a href="#roteiros" className="text-muted-foreground hover:text-foreground transition">Roteiros</a>
          <a href="#contato" className="text-muted-foreground hover:text-foreground transition">Contato</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
          <Link to="/interesse"><Button size="sm">Planejar minha viagem</Button></Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-ink-foreground">
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt=""
          width={1920}
          height={1280}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
      </div>
      <div className="relative section-padding flex min-h-[88vh] items-center py-20">
        <div className="max-w-2xl">
          <p className="brand-title text-xs text-primary-soft mb-6">Viaggiari Travel</p>
          <h1 className="font-display text-4xl md:text-6xl font-light leading-[1.05] text-ink-foreground">
            Sua viagem dos sonhos, <span className="text-primary-soft">planejada com quem vive para viajar.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-ink-foreground/70 max-w-xl leading-relaxed">
            Assessoria personalizada, do voo ao último passeio. Nada de pacotes genéricos —
            cada roteiro é desenhado para o seu jeito de viajar.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link to="/interesse"><Button size="lg" className="font-display tracking-wide">Quero planejar minha viagem</Button></Link>
            <a href="#roteiros"><Button size="lg" variant="outline" className="bg-transparent border-ink-foreground/30 text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">Ver roteiros prontos</Button></a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const items = [
    {
      icon: Plane,
      title: "Pacotes e Passagens",
      subtitle: "Para quem quer ir sem complicação",
      body: "Vendemos passagens e pacotes via parceiros comissionados. Você só aproveita.",
      cta: "Ver opções",
    },
    {
      icon: Compass,
      title: "Assessoria Completa",
      subtitle: "Para quem quer viver a melhor versão da viagem",
      body: "Nacional R$ 130/dia · Internacional R$ 150/dia. 50% na contratação, 50% na entrega do roteiro. Inclui passagens, hospedagem, passeios e suporte durante toda a viagem.",
      cta: "Quero uma assessoria",
    },
    {
      icon: Sparkles,
      title: "Consultoria Pontual",
      subtitle: "Para quem já sabe viajar mas precisa de direção",
      body: "Sessão de 1 hora com especialista. Ideal pra quem vai comprar tudo sozinho mas quer a estratégia certa.",
      cta: "Agendar consultoria",
    },
  ];
  return (
    <section id="servicos" className="section-padding py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="brand-title text-xs text-primary mb-3">Como funciona</p>
          <h2 className="font-display text-3xl md:text-4xl font-light">Três caminhos para a sua próxima viagem.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it) => (
            <article key={it.title} className="bg-surface border border-border rounded-xl p-8 flex flex-col">
              <it.icon className="w-7 h-7 text-primary mb-6" strokeWidth={1.5} />
              <h3 className="font-display text-xl mb-2">{it.title}</h3>
              <p className="text-sm text-primary mb-4">{it.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{it.body}</p>
              <Link to="/interesse" className="mt-8"><Button variant="outline" className="w-full">{it.cta}</Button></Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreReadyItineraries() {
  return (
    <section id="roteiros" className="section-padding py-24 md:py-32 bg-muted/40">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
          <div className="max-w-xl">
            <p className="brand-title text-xs text-primary mb-3">Roteiros prontos</p>
            <h2 className="font-display text-3xl md:text-4xl font-light">Destinos testados, planejados nos detalhes.</h2>
          </div>
          <Button variant="ghost" className="self-start md:self-end">Ver todos →</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {destinations.map((d) => (
            <article key={d.name} className="group bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden">
                <img src={d.img} alt={d.name} width={1024} height={1024} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                {d.featured && (
                  <span className="absolute top-4 left-4 brand-title text-[10px] bg-primary text-primary-foreground px-3 py-1 rounded-full">Mais vendido</span>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-display text-xl mb-1">{d.name}</h3>
                <p className="text-sm text-muted-foreground">{d.days}</p>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">a partir de</p>
                    <p className="font-display text-lg">{d.price}</p>
                  </div>
                  <Button size="sm">Comprar roteiro</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyViaggiari() {
  const items = [
    { icon: MapPin, title: "Roteiro hiperlinkado", desc: "Cada local com link direto pro Google Maps." },
    { icon: Heart, title: "Indicações testadas", desc: "Restaurantes e passeios que nós mesmas conhecemos." },
    { icon: ShieldCheck, title: "Suporte na viagem", desc: "Estamos por aqui se algo der errado." },
    { icon: Sparkles, title: "Comissão zero", desc: "Passeios sem taxas extras pra você." },
  ];
  return (
    <section className="section-padding py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="brand-title text-xs text-primary mb-3">Por que a Viaggiari</p>
          <h2 className="font-display text-3xl md:text-4xl font-light">Tudo pensado pra você só aproveitar.</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((it) => (
            <div key={it.title} className="flex flex-col">
              <it.icon className="w-6 h-6 text-primary mb-4" strokeWidth={1.5} />
              <h3 className="font-display text-base mb-2">{it.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeadSection() {
  return (
    <section id="contato" className="section-padding py-24 md:py-32 bg-ink text-ink-foreground">
      <div className="max-w-3xl mx-auto text-center">
        <p className="brand-title text-xs text-primary-soft mb-3">Vamos viajar?</p>
        <h2 className="font-display text-3xl md:text-5xl font-light leading-tight">Conta pra gente o que você tem em mente.</h2>
        <p className="mt-6 text-ink-foreground/70">Respondemos em até 24 horas, geralmente no mesmo dia.</p>
        <div className="mt-10 inline-block">
          <Link to="/interesse"><Button size="lg" className="font-display tracking-wide">Entrar em contato</Button></Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="section-padding py-12 border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <Logo size={36} withWordmark />
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="https://instagram.com/viaggiari" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition">
            <Instagram className="w-4 h-4" /> @viaggiari
          </a>
          <a href="mailto:contato@viaggiari.travel" className="flex items-center gap-2 hover:text-foreground transition">
            <Mail className="w-4 h-4" /> contato@viaggiari.travel
          </a>
        </div>
        <p className="text-xs text-muted-foreground">© 2025 Viaggiari Travel — Assessoria especializada em viagens</p>
      </div>
    </footer>
  );
}

function LeadDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = leadSchema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      destination: fd.get("destination") || undefined,
      travel_period: fd.get("travel_period") || undefined,
      service_interest: selected,
      message: fd.get("message") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("Não consegui enviar. Tente novamente.");
      return;
    }
    toast.success("Recebemos seu contato! Falaremos em breve.");
    setOpen(false);
    setSelected([]);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-light">Vamos planejar sua viagem</DialogTitle>
          <DialogDescription>Conta um pouco sobre o que você quer. Respondemos em até 24h.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" name="full_name" required maxLength={100} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required maxLength={255} />
            </div>
            <div>
              <Label htmlFor="phone">WhatsApp</Label>
              <Input id="phone" name="phone" required maxLength={30} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="destination">Para onde quer ir?</Label>
              <Input id="destination" name="destination" placeholder="Roma, Lisboa..." maxLength={200} />
            </div>
            <div>
              <Label htmlFor="travel_period">Quando?</Label>
              <Input id="travel_period" name="travel_period" placeholder="Outubro/2025" maxLength={50} />
            </div>
          </div>
          <div>
            <Label>Qual serviço te interessa?</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {services.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selected.includes(s)}
                    onCheckedChange={(c) => setSelected((prev) => c ? [...prev, s] : prev.filter((x) => x !== s))}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="message">Algo a mais? (opcional)</Label>
            <Textarea id="message" name="message" maxLength={500} rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Enviando..." : "Entrar em contato"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
