import { useEffect, useState } from "react";
import { Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton({
  className,
  size = "sm",
  variant = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "ghost" | "outline" | "secondary";
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !isIOS) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setShowIOSHelp((v) => !v);
  };

  return (
    <div className={cn("relative", className)}>
      <Button size={size} variant={variant} onClick={handleClick} className="font-display tracking-wide">
        <Download className="size-4" />
        Instalar app
      </Button>
      {showIOSHelp && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
          <p className="font-medium">Para instalar no iPhone:</p>
          <p className="mt-2 flex items-center gap-1.5">
            1. Toque em <Share className="size-3.5" /> Compartilhar
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            2. Escolha <Plus className="size-3.5" /> Adicionar à Tela de Início
          </p>
        </div>
      )}
    </div>
  );
}
