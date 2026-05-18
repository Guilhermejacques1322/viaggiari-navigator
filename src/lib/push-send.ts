// Worker-compatible web push sender. Uses Web Crypto APIs (works on Cloudflare Workers).
import { buildPushPayload, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";

export const VAPID_PUBLIC_KEY =
  "BPuzKuGTO-laFzVDcni9VYyxf8Bs8nhd0phOXttIiFEKKXF6jB6YHwF9_YHpV2QAEfx2emEbyvE5T6qXQtlNINI";

export type SubRow = { id?: string; endpoint: string; p256dh: string; auth: string };
export type SendResult = { ok: boolean; status?: number; error?: string };

function getVapid(): VapidKeys {
  return {
    subject: process.env.VAPID_SUBJECT || "mailto:contato@viaggiari.travel",
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
  };
}

export async function sendPushTo(sub: SubRow, body: string): Promise<SendResult> {
  try {
    const subscription: PushSubscription = {
      endpoint: sub.endpoint,
      expirationTime: null,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    const payload = await buildPushPayload(
      { data: body, options: { ttl: 60 } },
      subscription,
      getVapid(),
    );
    const res = await fetch(sub.endpoint, payload as unknown as RequestInit);
    if (res.status >= 200 && res.status < 300) return { ok: true, status: res.status };
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: text.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
