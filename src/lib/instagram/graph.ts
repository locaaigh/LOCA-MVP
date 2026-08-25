// ─────────────────────────────────────────────────────────────
// Helper compartido para llamadas a la Graph API de Instagram
// (graph.instagram.com). Espeja src/lib/meta/graph.ts pero contra
// el host de Instagram.
// ─────────────────────────────────────────────────────────────
import { INSTAGRAM_GRAPH_URL } from "./config";

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number } };

export async function igGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  const qs = new URLSearchParams({ access_token: accessToken, ...params });
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}${path}?${qs.toString()}`, { cache: "no-store" });
  const json = (await res.json()) as T & GraphError;
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Instagram Graph API error (HTTP ${res.status})`);
  }
  return json;
}

export async function igPost<T>(
  path: string,
  accessToken: string,
  params: Record<string, string>
): Promise<T> {
  const body = new URLSearchParams({ access_token: accessToken, ...params });
  const res = await fetch(`${INSTAGRAM_GRAPH_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const json = (await res.json()) as T & GraphError;
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Instagram Graph API error (HTTP ${res.status})`);
  }
  return json;
}
