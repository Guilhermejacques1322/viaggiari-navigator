import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  sendTestPushToSelf,
} from "@/lib/push.functions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isPreviewOrIframe() {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch (e) {
    return true;
  }
  const host = window.location.hostname;
  return host.includes("id-preview--") || host.includes("lovableproject.com");
}

export function NotificationsToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  const fetchKey = useServerFn(getVapidPublicKey);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const test = useServerFn(sendTestPushToSelf);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPreviewOrIframe()) {
      setIframeBlocked(true);
      return;
    }
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch((e) => console.warn("SW register failed", e));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Permissão negada para notificações");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { key } = await fetchKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await save({
        data: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          user_agent: navigator.userAgent.slice(0, 500),
        },
      });
      setSubscribed(true);
      await test();
      toast.success("Notificações ativadas. Enviamos uma de teste.");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível ativar");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await remove({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notificações desativadas");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao desativar");
    } finally {
      setBusy(false);
    }
  }

  if (iframeBlocked) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 bg-card text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Bell className="size-4" /> Notificações
        </p>
        <p className="mt-1 text-xs">
          Para ativar, abra o app no navegador (não dentro do editor) e adicione à tela inicial do celular.
        </p>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 bg-card text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <BellOff className="size-4" /> Notificações
        </p>
        <p className="mt-1 text-xs">
          Seu navegador não suporta notificações push. No iPhone, abra no Safari, toque em
          Compartilhar e use “Adicionar à Tela de Início” para receber lembretes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
          {subscribed ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Lembretes da sua viagem</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Avisos 1 dia e 1 hora antes de cada atividade.
          </p>
        </div>
        {subscribed ? (
          <Button size="sm" variant="ghost" onClick={disable} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Desativar"}
          </Button>
        ) : (
          <Button size="sm" onClick={enable} disabled={busy || permission === "denied"}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Ativar"}
          </Button>
        )}
      </div>
      {permission === "denied" && (
        <p className="text-xs text-destructive mt-2">
          Permissão bloqueada. Habilite notificações nas configurações do navegador.
        </p>
      )}
    </div>
  );
}
