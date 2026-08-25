// ─────────────────────────────────────────────────────────────
// Parseo y validación del signed_request que manda Instagram en el
// callback de desautorización. Mismo formato que Meta, pero la firma
// se valida con el App Secret de la app de Instagram.
// Formato: base64url(firma HMAC-SHA256) + "." + base64url(payload JSON)
// ─────────────────────────────────────────────────────────────
import { createHmac, timingSafeEqual } from "crypto";
import { getInstagramAppSecret } from "./config";

export type SignedRequestPayload = {
  user_id: string;
  algorithm: string;
  issued_at?: number;
};

/** Valida la firma con el App Secret de IG y devuelve el payload, o null si es inválido. */
export function parseSignedRequest(signedRequest: string): SignedRequestPayload | null {
  const [encodedSig, encodedPayload] = signedRequest.split(".");
  if (!encodedSig || !encodedPayload) return null;

  const expected = createHmac("sha256", getInstagramAppSecret())
    .update(encodedPayload)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(encodedSig, "base64url");
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SignedRequestPayload;
    if (payload.algorithm?.toUpperCase() !== "HMAC-SHA256") return null;
    if (!payload.user_id) return null;
    return payload;
  } catch {
    return null;
  }
}
