/** Verifica columnas del esquema insertando y borrando filas de prueba. */
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TEST_EMAIL = "e2e-test@loca.app";
const TEST_PASSWORD = "loca-e2e-test-2026";

async function main() {
  // Usuario de prueba (confirmado, sin email real)
  let userId: string;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (createErr) {
    if (/already been registered/i.test(createErr.message)) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === TEST_EMAIL)!.id;
      console.log("✓ Usuario de prueba ya existía:", userId);
    } else {
      console.error("✗ No se pudo crear usuario:", createErr.message);
      process.exit(1);
    }
  } else {
    userId = created.user.id;
    console.log("✓ Usuario de prueba creado:", userId);
  }

  // Probar el shape de cada tabla
  const bizRow = { id: "biz_schema_test", user_id: userId, data: { name: "test" } };
  const { error: bizErr } = await admin.from("businesses").upsert(bizRow);
  console.log(bizErr ? `✗ businesses: ${bizErr.message}` : "✓ businesses shape OK");

  const { error: stratErr } = await admin
    .from("strategies")
    .upsert({ business_id: "biz_schema_test", user_id: userId, data: { x: 1 } });
  console.log(stratErr ? `✗ strategies: ${stratErr.message}` : "✓ strategies shape OK");

  const { error: calErr } = await admin.from("calendar_items").upsert({
    id: "cal_schema_test",
    business_id: "biz_schema_test",
    user_id: userId,
    data: { x: 1 },
  });
  console.log(calErr ? `✗ calendar_items: ${calErr.message}` : "✓ calendar_items shape OK");

  const { error: contErr } = await admin.from("contents").upsert({
    id: "cnt_schema_test",
    business_id: "biz_schema_test",
    user_id: userId,
    data: { x: 1 },
    image_url: "https://example.com/x.png",
    image_status: "generada",
    image_error: null,
  });
  console.log(contErr ? `✗ contents: ${contErr.message}` : "✓ contents shape OK (con columnas image_*)");

  // Limpieza (cascade borra lo demás)
  await admin.from("businesses").delete().eq("id", "biz_schema_test");
  console.log("✓ Filas de prueba eliminadas");
}

main();
