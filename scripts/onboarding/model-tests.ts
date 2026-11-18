// ─────────────────────────────────────────────────────────────
// RED DE SEGURIDAD del modelo del onboarding (Fase 0 del refactor).
// Congela, como snapshots JSON, el comportamiento OBSERVABLE del modelo puro
// (sin React, sin red): qué campos faltan por flujo, qué pide cada paso del
// wizard, cómo aplican los overrides del admin y cómo se mapea un análisis
// real a un negocio. Durante el refactor estos snapshots NO deben cambiar
// (salvo renombres de import): si uno cambia, hubo un cambio de comportamiento.
//
//   npx tsx scripts/onboarding/model-tests.ts            → compara
//   npx tsx scripts/onboarding/model-tests.ts --update   → regenera (solo a conciencia)
// ─────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { emptyBusiness } from "../../src/lib/business-defaults";
import { applyAnalysisToBusiness } from "../../src/lib/onboarding/apply-analysis";
import {
  QUESTIONS,
  FLOOR_FIELD_IDS,
  applyFieldConfigOverrides,
  missingRequiredQuestions,
  missingCriticalQuestions,
  isQuestionRequired,
  completionPercent,
  sectionsStatus,
} from "../../src/lib/business-questions";
import { requirementsForStep, isFieldRequired } from "../../src/lib/onboarding/wizard-layout";
import { getMissingRequiredFields } from "../../src/lib/onboarding-validation";
import { parseExternalMarkdown, sampleImportMarkdown } from "../../src/lib/md-import";
import type { Business, WebsiteAnalysis } from "../../src/lib/types";

const UPDATE = process.argv.includes("--update");
const SNAP_DIR = join(__dirname, "snapshots");
mkdirSync(SNAP_DIR, { recursive: true });

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}\n   ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  }
}

// JSON determinístico (claves ordenadas) para comparar sin ruido.
function stable(v: unknown): string {
  const sort = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(sort)
      : x && typeof x === "object"
        ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])]))
        : x;
  return JSON.stringify(sort(v), null, 2);
}

function firstDiff(a: string, b: string): string {
  const la = a.split("\n"), lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) return `línea ${i + 1}:\n   esperado: ${la[i] ?? "(fin)"}\n   actual:   ${lb[i] ?? "(fin)"}`;
  }
  return "(sin diferencia de líneas; ¿largo distinto?)";
}

function snapshot(name: string, value: unknown) {
  const file = join(SNAP_DIR, `${name}.json`);
  const actual = stable(value);
  if (UPDATE || !existsSync(file)) {
    writeFileSync(file, actual + "\n");
    console.log(`  ✎ snapshot ${UPDATE ? "actualizado" : "creado"}: ${name}.json`);
    return;
  }
  const expected = readFileSync(file, "utf8").trimEnd();
  if (expected !== actual) {
    throw new Error(`snapshot "${name}" cambió → ${firstDiff(expected, actual)}\n   (si el cambio es intencional: --update)`);
  }
}

// Quita lo volátil (ids aleatorios, fechas) para que el snapshot sea estable.
function normalize(b: Business): Record<string, unknown> {
  const { id: _id, userId: _u, createdAt: _c, updatedAt: _d, ...rest } = b;
  return {
    ...rest,
    productsServices: b.productsServices.map(({ id: _pid, ...p }) => p),
  };
}

// ── Negocios de ejemplo, uno por flujo ───────────────────────
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/extract-mateando.json"), "utf8")) as {
  data: WebsiteAnalysis;
};
const EMPTY = emptyBusiness("anon");
const WEB = applyAnalysisToBusiness(emptyBusiness("anon"), fixture.data);
const MD = applyAnalysisToBusiness(emptyBusiness("anon"), parseExternalMarkdown(sampleImportMarkdown()));
const MANUAL: Business = {
  ...emptyBusiness("anon"),
  name: "Café Bruma",
  industry: "Food & Beverage",
  subcategory: "Cafetería",
  businessType: "Local físico",
  country: "Argentina",
  shortDescription: "Café de especialidad en Palermo.",
  competitiveAdvantages: ["Tostado propio"],
  marketingChannels: ["Instagram"],
  audience: { ...emptyBusiness("anon").audience, ageRanges: ["25-34"] },
};
const FLOWS: Record<string, Business> = { empty: EMPTY, web: WEB, md: MD, manual: MANUAL };

// Ids de DOM de los 34 campos del wizard manual (hardcodeados a propósito:
// el test no depende de ningún módulo de layout).
const WIZARD_FIELD_IDS = [
  "name", "industry", "subcategory", "businessType", "businessStage", "yearFounded", "employees",
  "country", "state", "city", "shortDescription", "fullDescription", "values", "competitiveAdvantages",
  "marketingChannels", "marketingActivities", "hasSeasonality", "hasSpecialDates", "bk_color", "bk_font",
  "bk_tone", "personPhotos", "products", "ageRanges", "locations", "painPoints", "behavior", "segments",
  "primaryContentGoal", "businessObjectives", "successMetrics", "marketingObjectives", "timeline",
  "publishChannels",
];

applyFieldConfigOverrides([]); // defaults de código, sin overrides

test("registro de preguntas: ids, secciones, inputs, flags y textos", () => {
  snapshot(
    "questions-registry",
    QUESTIONS.map((q) => ({
      id: q.id,
      section: q.section,
      input: q.input,
      required: isQuestionRequired(q),
      critical: q.critical,
      canSuggest: !!q.canSuggest,
      allowCustom: !!q.allowCustom,
      label: q.label,
      why: q.why,
      placeholder: q.placeholder ?? null,
      floor: FLOOR_FIELD_IDS.has(q.id),
    }))
  );
});

test("faltantes por flujo (obligatorios, críticos, isMissing de las 36, completitud, secciones)", () => {
  snapshot(
    "missing-by-flow",
    Object.fromEntries(
      Object.entries(FLOWS).map(([flow, b]) => [
        flow,
        {
          required: missingRequiredQuestions(b).map((q) => q.id),
          critical: missingCriticalQuestions(b).map((q) => q.id),
          isMissing: Object.fromEntries(QUESTIONS.map((q) => [q.id, q.isMissing(b)])),
          completion: completionPercent(b),
          sections: sectionsStatus(b),
        },
      ])
    )
  );
});

test("wizard manual: qué pide cada paso (1..7) y qué falta por paso en cada flujo", () => {
  snapshot("wizard-steps", {
    byStep: Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((s) => [s, requirementsForStep(s).map((f) => ({ id: f.id, label: f.label, critical: f.critical }))])
    ),
    missingByFlow: Object.fromEntries(
      Object.entries(FLOWS).map(([flow, b]) => [
        flow,
        Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((s) => [s, getMissingRequiredFields(s, b).map((m) => m.id)])),
      ])
    ),
  });
});

test("wizard manual: isFieldRequired para los 34 ids (config default)", () => {
  snapshot("wizard-field-required", Object.fromEntries(WIZARD_FIELD_IDS.map((id) => [id, isFieldRequired(id)])));
});

test("apply-analysis: análisis real de web → negocio", () => {
  snapshot("apply-analysis-web", normalize(WEB));
});

test("apply-analysis: import .md de muestra → negocio", () => {
  snapshot("apply-analysis-md", normalize(MD));
});

test("overrides del admin: flags, textos, orden, piso e invariante crítico⇒obligatorio", () => {
  const view = () => QUESTIONS.map((q) => ({ id: q.id, required: isQuestionRequired(q), critical: q.critical, label: q.label, why: q.why, placeholder: q.placeholder ?? null }));
  const defaults = view();

  applyFieldConfigOverrides([
    { fieldId: "values", required: false },
    { fieldId: "businessObjectives", critical: true, required: false }, // crítico arrastra obligatorio
    { fieldId: "seasonalityTags", label: "Temporadas", why: "Ayuda editada", placeholder: "Ej: verano" },
    { fieldId: "name", required: false, critical: false }, // piso: se ignora
    { fieldId: "city", sortOrder: -5 }, // pasa a ser la primera
    { fieldId: "inexistente", required: false },
  ]);
  const overridden = view();
  snapshot("overrides-applied", overridden);

  // Invariantes que no dependen del snapshot.
  for (const q of QUESTIONS) if (q.critical) assert.equal(isQuestionRequired(q), true, `crítico⇒obligatorio roto en ${q.id}`);
  const name = QUESTIONS.find((q) => q.id === "name")!;
  assert.equal(name.critical, true, "piso: name sigue crítico");
  assert.equal(isQuestionRequired(name), true, "piso: name sigue obligatorio");
  assert.equal(QUESTIONS[0].id, "city", "sortOrder negativo pone a city primero");
  assert.equal(isFieldRequired("values"), false, "el wizard respeta required:false del admin");
  assert.equal(requirementsForStep(2).some((f) => f.id === "values"), false, "values no se pide en el paso 2");

  // Idempotencia: volver a aplicar lo mismo no acumula; limpiar restaura defaults.
  applyFieldConfigOverrides([
    { fieldId: "values", required: false },
    { fieldId: "businessObjectives", critical: true, required: false },
    { fieldId: "seasonalityTags", label: "Temporadas", why: "Ayuda editada", placeholder: "Ej: verano" },
    { fieldId: "name", required: false, critical: false },
    { fieldId: "city", sortOrder: -5 },
    { fieldId: "inexistente", required: false },
  ]);
  assert.equal(stable(view()), stable(overridden), "aplicar dos veces da lo mismo");
  applyFieldConfigOverrides([]);
  assert.equal(stable(view()), stable(defaults), "sin overrides vuelve a los defaults");
  assert.equal(isFieldRequired("values"), true, "el wizard vuelve a pedir values");
});

console.log(`\n${passed} pruebas OK${process.exitCode ? " (con fallos)" : ""}`);
