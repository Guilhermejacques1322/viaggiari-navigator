import { Plane, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

export function FlightAnimation() {
  return (
    <Card className="p-6 overflow-hidden">
      <p className="brand-title text-[10px] text-primary mb-5">Boa viagem</p>

      <div className="relative h-14">
        {/* trilha tracejada de fundo */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 border-t border-dashed border-border" />
        {/* trilha percorrida */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 overflow-hidden">
          <div className="h-px bg-primary/60 animate-[trail-grow_4.5s_ease-in-out_infinite]" />
        </div>

        {/* pontos */}
        <span className="absolute left-0 top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-full bg-primary/10 text-primary">
          <MapPin className="size-4" />
        </span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-full bg-primary/10 text-primary">
          <MapPin className="size-4" />
        </span>

        {/* avião */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
          <div className="animate-[fly-across_4.5s_ease-in-out_infinite] w-fit">
            <Plane className="size-5 text-primary rotate-45" />
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Sua próxima história já está a caminho.
      </p>
    </Card>
  );
}
