// ─────────────────────────────────────────────────────────────
// Cuentas de Meta: usuario, pages y cuenta de Instagram Business.
// ─────────────────────────────────────────────────────────────
import { graphGet } from "./graph";

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

/** ID y nombre del usuario de Meta autenticado. */
export async function fetchMetaUser(
  userToken: string
): Promise<{ id: string; name?: string }> {
  return graphGet<{ id: string; name?: string }>("/me", userToken, { fields: "id,name" });
}

/** Pages administradas por el usuario, con su IG Business si tienen. */
export async function fetchPages(userToken: string): Promise<MetaPage[]> {
  const json = await graphGet<{ data: MetaPage[] }>("/me/accounts", userToken, {
    fields: "id,name,access_token,instagram_business_account{id,username}",
  });
  return json.data ?? [];
}

/**
 * Elige la page a conectar: prioriza la primera con Instagram Business
 * vinculado; si ninguna tiene, usa la primera page.
 */
export function pickPage(pages: MetaPage[]): MetaPage | null {
  if (!pages.length) return null;
  return pages.find((p) => p.instagram_business_account?.id) ?? pages[0];
}
