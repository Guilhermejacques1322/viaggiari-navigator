import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Plane, CreditCard, Phone, ShieldCheck, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/minha-viagem/parceiros")({
  component: Parceiros,
});

const PARTNERS = [
  {
    name: "Seguro Viagem",
    description: "Cobertura internacional com desconto exclusivo Viaggiari.",
    icon: ShieldCheck,
    href: "https://www.segurosparaviagem.com.br/",
  },
  {
    name: "Chip internacional",
    description: "Internet 4G/5G nos principais destinos. Receba antes de embarcar.",
    icon: Globe,
    href: "https://www.holafly.com/",
  },
  {
    name: "Cartão de crédito",
    description: "Sem IOF e com câmbio comercial nas compras internacionais.",
    icon: CreditCard,
    href: "https://www.nomadglobal.com/",
  },
  {
    name: "Transfer e traslados",
    description: "Carro privativo do aeroporto até seu hotel.",
    icon: Plane,
    href: "https://welcomepickups.com/",
  },
  {
    name: "Atendimento 24h",
    description: "Fale com a Nani direto no WhatsApp em qualquer emergência.",
    icon: Phone,
    href: "https://wa.me/",
  },
];

function Parceiros() {
  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Parceiros</p>
        <h1 className="font-display text-2xl md:text-3xl font-light">Indicações da Nani</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Marcas que a gente confia e usa nas próprias viagens. Você ganha condições especiais.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {PARTNERS.map((p) => {
          const Icon = p.icon;
          return (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <Card className="p-5 h-full hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-medium flex items-center gap-1.5">
                      {p.name}
                      <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  </div>
                </div>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}
