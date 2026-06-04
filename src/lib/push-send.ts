// Worker-compatible web push sender. Uses Web Crypto APIs (works on Cloudflare Workers).
import { createECDH } from "node:crypto";
import { buildPushPayload, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";

export type SubRow = { id?: string; endpoint: string; p256dh: string; auth: string };
export type SendResult = { ok: boolean; status?: number; error?: string };

let cachedPublicKey: string | null = null;

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function encodeBase64Url(value: Uint8Array | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getVapidPrivateKey() {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) throw new Error("VAPID private key is not configured");
  return privateKey;
}

export function getVapidPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;

  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(decodeBase64Url(getVapidPrivateKey()));
  cachedPublicKey = encodeBase64Url(ecdh.getPublicKey(undefined, "uncompressed"));

  return cachedPublicKey;
}

function getVapid(): VapidKeys {
  return {
    subject: process.env.VAPID_SUBJECT || "mailto:contato@viaggiari.com.br",
    publicKey: getVapidPublicKey(),
    privateKey: getVapidPrivateKey(),
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
