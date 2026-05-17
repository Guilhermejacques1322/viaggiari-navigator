import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/interesse")({
  head: () => ({
    meta: [
      { title: "Planejar minha viagem — Viaggiari Travel" },
      { name: "description", content: "Conte para nós sobre a viagem dos seus sonhos. Respondemos em até 24h." },
    ],
  }),
  component: InteressePage,
});

const SERVICE_MAP = {
  assessoria: { label: "Quero que cuidem de tudo por mim", db: "assessoria" as const },
  pacote: { label: "Preciso só de passagem e hotel", db: "package" as const },
  consultoria: { label: "Já sei viajar, quero só uma orientação", db: "consultoria" as const },
  indefinido: { label: "Ainda não sei, quero entender as opções", db: null as null },
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(8, "Informe um WhatsApp válido").max(30),
  destination: z.string().trim().min(1, "Informe um destino").max(200),
  travel_period: z.string().trim().min(1, "Informe quando").max(50),
  service_key: z.enum(["assessoria", "pacote", "consultoria", "indefinido"]),
});

function InteressePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serviceKey, setServiceKey] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      destination: fd.get("destination"),
      travel_period: fd.get("travel_period"),
      service_key: serviceKey,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos");
      return;
    }
    setSubmitting(true);
    const svc = SERVICE_MAP[parsed.data.service_key];
    const { error } = await supabase.from("leads").insert({
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      destination: parsed.data.destination,
      travel_period: parsed.data.travel_period,
      service_interest: svc.db ? [svc.db] : [],
    });
    setSubmitting(false);
    if (error) {
      toast.error("Não consegui enviar. Tente novamente.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="section-padding py-6 flex items-center justify-between">
        <Link to="/"><Logo size={36} withWordmark /></Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center section-padding py-12">
        <div className="w-full max-w-lg">
          {done ? (
            <div className="text-center space-y-6">
              <div className="mx-auto size-14 rounded-full bg-primary/10 grid place-items-center">
                <Check className="size-7 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-light">Recebemos seu contato!</h1>
              <p className="text-muted-foreground">Em breve a Nani vai falar com você.</p>
              <Button onClick={() => navigate({ to: "/" })} variant="outline">Voltar para o início</Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl font-light mb-2">Vamos planejar sua viagem</h1>
              <p className="text-sm text-muted-foreground mb-8">
                Conte um pouco sobre o que você tem em mente. Respondemos em até 24h.
              </p>
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
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input id="phone" name="phone" required maxLength={30} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="destination">Para onde você sonha em ir?</Label>
                  <Input id="destination" name="destination" required maxLength={200} placeholder="Roma, Lisboa, Nordeste..." />
                </div>
                <div>
                  <Label htmlFor="travel_period">Quando você pretende viajar?</Label>
                  <Input id="travel_period" name="travel_period" required maxLength={50} placeholder="Ex: Outubro/2025" />
                </div>
                <div>
                  <Label>O que você está buscando?</Label>
                  <Select value={serviceKey} onValueChange={setServiceKey} required>
                    <SelectTrigger><SelectValue placeholder="Escolha uma opção" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting || !serviceKey}>
                  {submitting ? "Enviando..." : "Quero ser contactado"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate({ to: "/" })}
                >
                  <ArrowLeft className="size-4" /> Voltar ao início
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
