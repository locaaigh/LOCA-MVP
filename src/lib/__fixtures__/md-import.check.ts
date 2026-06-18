// Test simple del parser .md (sin framework). Correr con:
//   npx tsx src/lib/__fixtures__/md-import.check.ts
// Valida que un .md realista parsee sin perder los campos clave y que los
// marcadores FALTA_COMPLETAR / INFERIDO / REVISAR se interpreten bien.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseExternalMarkdown } from "../md-import";

const here = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(here, "loca-resumen-ejemplo.md"), "utf8");

const a = parseExternalMarkdown(md);
const f = a.foundFields;

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}`);
}

check("nombre del negocio se carga", f.name === "Café Bruma");
check("industria se carga", f.industry === "Food & Beverage");
check("país se carga", f.country === "Argentina");
check("descripción corta se carga", !!f.shortDescription);
check("productos/servicios se crean", (f.productsServices?.length || 0) === 4);
check("precio explícito se respeta (Blend $4500)", f.productsServices?.some((p) => p.price === 4500) === true);
check("no se inventan precios (resto sin price)", f.productsServices?.filter((p) => p.price != null).length === 1);
check("top seller marcado", f.productsServices?.some((p) => p.isTopSeller) === true);
check("canales se cargan (IG/FB/TikTok)", JSON.stringify(f.marketingChannels) === JSON.stringify(["Instagram", "Facebook", "TikTok"]));
check("objetivo principal se carga (ventas)", f.goals?.primaryContentGoal === "ventas");
check("tono se carga", (f.brandKit?.voiceTone?.toneTags?.length || 0) === 3);
check("propuesta de valor se carga", (f.competitiveAdvantages?.length || 0) === 3);
check("audiencia edades (25-34, 35-44)", JSON.stringify(f.audience?.ageRanges) === JSON.stringify(["25-34", "35-44"]));
check("audiencia segmentos se cargan", (f.audience?.segments?.length || 0) === 2);
check("INFERIDO → suggested (ciudad)", a.fieldStatuses["city"]?.status === "suggested");
check("FALTA_COMPLETAR → missing (descripción larga)", a.missingFields.includes("fullDescription"));
check("REVISAR cargó el valor (dolores)", (f.audience?.painPoints?.length || 0) === 1);

console.log(failures === 0 ? "\nTODO OK ✅" : `\n${failures} FALLAS ❌`);
if (failures > 0 && typeof process !== "undefined") process.exitCode = 1;
