// ─────────────────────────────────────────────────────────────
// Renovación de tokens de larga duración antes de que venzan.
// El user token de Meta dura ~60 días; lo renovamos cuando le
// quedan menos de 14. Los Page tokens derivados también se
// refrescan por higiene (se re-obtienen de /me/accounts).
// ─────────────────────────────────────────────────────────────
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/connections/crypto";
import { exchangeForLongLivedToken } from "./oauth";
import { fetchPages } from "./accounts";
import type { ConnectionRow } from "@/lib/connections/repository";

const REFRESH_WINDOW_DAYS = 14;

export type RefreshSummary = {
  checked: number;
  refreshed: number;
  failed: { businessId: string; error: string }[];
};

export async function refreshExpiringTokens(): Promise<RefreshSummary> {
  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Solo conexiones de Facebook: el intercambio de abajo es de Graph API
  // (fb_exchange_token + /me/accounts). Instagram y LinkedIn renuevan por
  // otros endpoints y tienen su propio paso en el cron.
  const { data, error } = await admin
    .from("social_connections")
    .select("*")
    .eq("provider", "facebook")
    .eq("status", "active")
    .lt("token_expires_at", cutoff);
  if (error) throw new Error(`Error buscando tokens por vencer: ${error.message}`);

  const rows = (data ?? []) as ConnectionRow[];
  const summary: RefreshSummary = { checked: rows.length, refreshed: 0, failed: [] };

  for (const row of rows) {
    try {
      const currentToken = decryptToken(row.user_access_token_enc);
      const renewed = await exchangeForLongLivedToken(currentToken);
      const expiresAt = renewed.expires_in
        ? new Date(Date.now() + renewed.expires_in * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      // Re-obtener el Page token con el token nuevo (si hay page conectada)
      let pageTokenEnc = row.page_access_token_enc;
      if (row.account_id) {
        try {
          const pages = await fetchPages(renewed.access_token);
          const page = pages.find((p) => p.id === row.account_id);
          if (page) pageTokenEnc = encryptToken(page.access_token);
        } catch {
          // Si falla, conservamos el Page token anterior (no expira solo)
        }
      }

      const { error: upErr } = await admin
        .from("social_connections")
        .update({
          user_access_token_enc: encryptToken(renewed.access_token),
          page_access_token_enc: pageTokenEnc,
          token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id)
        .eq("business_id", row.business_id)
        // Sin esto pisaría también las conexiones de IG/LinkedIn del negocio:
        // la PK ahora incluye el proveedor.
        .eq("provider", row.provider);
      if (upErr) throw new Error(upErr.message);

      summary.refreshed++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "error desconocido";
      summary.failed.push({ businessId: row.business_id, error: msg });
      // Marcar en error para que la UI ofrezca reconectar
      await admin
        .from("social_connections")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("user_id", row.user_id)
        .eq("business_id", row.business_id)
        .eq("provider", row.provider);
    }
  }

  return summary;
}
