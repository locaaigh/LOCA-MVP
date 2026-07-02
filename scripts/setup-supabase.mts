/**
 * Setup de Supabase: crea el bucket de imágenes y verifica el esquema.
 * Uso: npx tsx scripts/setup-supabase.mts
 * Lee las keys de .env.local (no las expone).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  // 1. Bucket de imágenes
  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    console.error("No se pudo conectar a Storage:", listErr.message);
    process.exit(1);
  }
  if (buckets.some((b) => b.name === "content-images")) {
    console.log("✓ Bucket content-images ya existe");
  } else {
    const { error } = await admin.storage.createBucket("content-images", { public: true });
    if (error) {
      console.error("✗ No se pudo crear el bucket:", error.message);
    } else {
      console.log("✓ Bucket content-images creado (público)");
    }
  }

  // 2. Verificar tablas del esquema
  const tables = ["businesses", "strategies", "calendar_items", "contents"];
  let allOk = true;
  for (const t of tables) {
    const { error } = await admin.from(t).select("user_id").limit(1);
    if (error) {
      allOk = false;
      console.log(`✗ Tabla ${t}: ${error.message}`);
    } else {
      console.log(`✓ Tabla ${t} OK`);
    }
  }
  if (!allOk) {
    console.log(
      "\n→ Falta el esquema: ejecutá supabase/migrations/0001_init.sql en el SQL Editor del dashboard."
    );
    process.exit(2);
  }
  console.log("\nTodo listo ✓");
}

main();
