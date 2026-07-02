/**
 * Test E2E del flujo de contenido+imagen.
 * - Modo demo (default): usa el header x-loca-user-id (repo en memoria)
 * - Modo auth (AUTH=1): inicia sesión en Supabase y usa cookies (repo Postgres)
 */
import { readFileSync } from "node:fs";
import { DEMO_BUSINESSES } from "../src/lib/demo";
import { mockStrategy, mockCalendar } from "../src/lib/ai/mock";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const AUTH = process.env.AUTH === "1";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

async function getAuthCookie(): Promise<string> {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anon },
    body: JSON.stringify({ email: "e2e-test@loca.app", password: "loca-e2e-test-2026" }),
  });
  const session = await res.json();
  if (!session.access_token) throw new Error("Login falló: " + JSON.stringify(session));
  const ref = new URL(url).hostname.split(".")[0];
  // Formato de cookie de @supabase/ssr: base64-<base64url(JSON de la sesión)>
  const value =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  return `sb-${ref}-auth-token=${value}`;
}

async function main() {
  const cookie = AUTH ? await getAuthCookie() : "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (AUTH) headers.Cookie = cookie;
  else headers["x-loca-user-id"] = "user_demo";
  console.log(`Modo: ${AUTH ? "AUTENTICADO (Supabase)" : "demo (memoria)"}`);

  // ID único por corrida: NUNCA usar ids compartidos (biz_cafe_bruma) en
  // pruebas — con ids repetidos entre usuarios se pisaban filas ajenas.
  const runId = `test_${Date.now()}`;
  const biz = { ...DEMO_BUSINESSES[0], id: `biz_${runId}` };
  const strategy = { ...mockStrategy(biz), businessId: biz.id };
  const cal = mockCalendar(biz, strategy, 2).map((c) => ({ ...c, businessId: biz.id }));

  const sync = await fetch(`${BASE}/api/sync`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      businesses: [biz],
      strategies: { [biz.id]: strategy },
      calendars: { [biz.id]: cal },
      contents: [],
    }),
  });
  console.log("sync:", sync.status, sync.ok ? "" : await sync.text());
  if (!sync.ok) process.exit(1);

  const t0 = Date.now();
  const contentRes = await fetch(`${BASE}/api/content`, {
    method: "POST",
    headers,
    body: JSON.stringify({ businessId: biz.id, calendarItemId: cal[0].id }),
  });
  const cj = await contentRes.json();
  console.log(
    "content:",
    contentRes.status,
    cj.data?.id,
    `provider=${cj.meta?.provider}`,
    `${Date.now() - t0}ms`
  );
  if (!contentRes.ok) {
    console.log(cj);
    process.exit(1);
  }

  // SIN re-sync: /api/content debe haber persistido la pieza en el repo
  const t1 = Date.now();
  const imageRes = await fetch(`${BASE}/api/image`, {
    method: "POST",
    headers,
    body: JSON.stringify({ businessId: biz.id, contentId: cj.data.id }),
  });
  const ij = await imageRes.json();
  const url: string = ij.data?.imageUrl || "";
  console.log(
    "image:",
    imageRes.status,
    ij.error || "",
    `provider=${ij.data?.provider}`,
    `status=${ij.data?.status}`,
    `${Date.now() - t1}ms`
  );
  console.log(
    "imageUrl:",
    url.startsWith("data:") ? `base64 (${(url.length / 1024).toFixed(0)} KB)` : url
  );
  if (!imageRes.ok) process.exit(1);

  if (AUTH) {
    const snapRes = await fetch(`${BASE}/api/snapshot`, { headers: { Cookie: cookie } });
    const snap = await snapRes.json();
    const persisted = snap.contents?.find((c: { id: string }) => c.id === cj.data.id);
    console.log(
      "snapshot:",
      snapRes.status,
      `${snap.businesses?.length} negocios, ${snap.contents?.length} contenidos`
    );
    console.log(
      "imagen persistida en DB:",
      persisted?.imageUrl && !persisted.imageUrl.startsWith("data:")
        ? `✓ URL de Storage: ${persisted.imageUrl}`
        : persisted?.imageUrl
          ? "✗ quedó como base64"
          : "✗ sin imageUrl"
    );

    // Borrado explícito del negocio de prueba (limpia DB + Storage del test)
    const delRes = await fetch(`${BASE}/api/business?id=${biz.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    console.log("delete negocio de prueba:", delRes.status);

    const snap2 = await fetch(`${BASE}/api/snapshot`, { headers: { Cookie: cookie } }).then((r) =>
      r.json()
    );
    const stillThere = snap2.businesses?.some((b: { id: string }) => b.id === biz.id);
    console.log("negocio eliminado del server:", stillThere ? "✗ sigue ahí" : "✓");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
