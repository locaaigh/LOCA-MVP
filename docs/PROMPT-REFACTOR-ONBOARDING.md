# Prompt: refactor del onboarding de LOCA-MVP

> Copiar desde "## Contexto" hasta el final y dárselo a la IA. Está pensado para
> ejecutarse en varias sesiones/PRs, no de una sola vez.

## Contexto

Sos un ingeniero senior trabajando en LOCA-MVP (Next.js 14 App Router, React 18, TypeScript estricto, Zustand, Supabase, Tailwind). Vas a refactorizar el **onboarding** — la etapa que va desde `/onboarding` (anónimo) hasta "Confirmar y preparar estrategia" (crea cuenta si hace falta, persiste el negocio y va a `/strategy`).

El código funciona y está en producción. Creció por acumulación de fixes incrementales en pocas semanas: cada fix fue correcto en aislamiento, pero el conjunto quedó con duplicaciones, mapas dispersos y un archivo de 2.100 líneas. **El objetivo es ordenarlo SIN cambiar comportamiento.**

Archivos involucrados (leelos todos antes de proponer nada):
- `src/app/onboarding/page.tsx` (2.131 líneas, 19 componentes/funciones adentro)
- `src/lib/business-questions.ts` (registro de las 36 preguntas: flags, inputs, get/apply/isMissing, overrides del admin)
- `src/lib/onboarding/field-requirements.ts` (validación por paso del wizard manual)
- `src/lib/onboarding-validation.ts`
- `src/components/pending-flow.tsx`, `src/components/question-field.tsx`
- `src/components/onboarding-summary.tsx`, `src/components/onboarding-signup-modal.tsx`
- `src/lib/onboarding/{apply-analysis,complete,field-config,field-config-client,strategy-gate}.ts`, `src/lib/onboarding-draft.ts`
- `docs/PLAN-BACKOFFICE-ADMINS.md` (contexto de por qué existen los overrides del admin)

## Reglas no negociables

1. **Cero cambios de comportamiento observables.** Mismas pantallas, mismos textos, mismo orden, mismos bloqueos, mismos eventos de analytics (`track(...)` con los mismos nombres y props), mismos ids de DOM usados para scroll/foco (`id="..."` en `HelpField`, `pf-<id>` en pendientes). Si un cambio de comportamiento te parece necesario, anotalo en una sección "Propuestas fuera de alcance" del PR y NO lo hagas.
2. **Los tres flujos deben seguir funcionando igual**: (a) web → Eva, (b) .md de IA externa → Eva, (c) manual. Y el modo edición (`/onboarding?edit=1`) y la reanudación de borrador (`?resume=1`, modal de registro con email/Google/login).
3. **No tocar migraciones ni contratos de API** (`/api/extract`, `/api/onboarding/field-config`, `/api/analysis-log*`, `/api/admin/*`). No tocar `src/lib/ai/*`.
4. **Un PR por fase** (abajo), cada uno mergeable solo, con `tsc` y `next build` limpios y la verificación de la fase. Cambios a `main` SOLO por PR.
5. Respetar el registro único: `business-questions.ts` es la fuente de verdad de campos, flags (`required`/`critical`) y overrides del admin. Nada puede volver a hardcodear "qué es obligatorio" o "qué es crítico" fuera de ahí.
6. Comentarios solo para restricciones que el código no muestra (por qué existe un fallback, por qué un orden). Nada de comentarios que describan el cambio.

## Diagnóstico (lo que tenés que resolver, con evidencia)

### A. `page.tsx` es un monolito
- 2.131 líneas con 19 funciones/componentes: `OnboardingPageInner` (809 líneas, 17 `useState/useRef`), los 7 `Step*`, `SectionEditor`, `CommercialEditor`, `MethodSelect`, `MethodCard`, `WebImportScreen`, `AiImportScreen`, `PendingScreen`, `StepIntro`, `StepDot`, `withCurrent`, `sectionTitle`.
- Mezcla orquestación de fases (`select | web | ai | pending | wizard`), estado del negocio, analytics, gate de finalización, auth y 8 pantallas de UI.
- Hace `fetch` directo a `/api/analysis-log` y `/api/analysis-log/complete` desde el componente (líneas ~269 y ~352) en vez de pasar por `src/lib/api.ts`.
- Tiene 5 `as any`.

### B. Dos sistemas de "campos" que se mapean entre sí a mano
- `field-requirements.ts` (validación por paso del wizard, con sus propios `id`/`label`/`isMissing`) y `business-questions.ts` (registro de 36 preguntas). Hoy el primero consulta al segundo para `required`, pero conserva su propia lista de 34 entradas con `isMissing` DUPLICADOS (p.ej. `name`, `industry`, `products`…).
- Para que convivan existen **cuatro mapas dispersos**: `WIZARD_TO_QUESTION_ID` (field-requirements), `PENDING_STEP_OF_SECTION` (page.tsx), `SECTION_MAP` QSection→SummarySectionKey (pending-flow), y el objeto `miss` hardcodeado del resumen (`onboarding-summary.tsx:80-82`, que reimplementa "qué es crítico" a mano — viola la regla 5).
- Código muerto en `field-requirements.ts`: `isCriticalField`, `missingRequired`, `firstIncompleteStep` tienen 0 usos externos.
- Los textos de los `Step*` del wizard (labels, placeholders, ayudas) siguen hardcodeados en JSX, mientras que las mismas preguntas tienen `label/placeholder/why` en el registro (y el admin puede editarlos). Hoy el `*` lee del registro (`isFieldRequired`) pero el texto no.

### C. Render de inputs duplicado
- `question-field.tsx` (switch de 8 casos) y `pending-flow.tsx` (ternario encadenado de 8 casos) renderizan LO MISMO con código distinto. El comentario de `QuestionField` dice "fuente única… reutilizada por PendingFlow", pero PendingFlow no lo usa.
- Las listas de opciones viven en 3 lugares distintos según el campo: `constants.ts` (`EMPLOYEE_OPTIONS`…), inline en los `Step*`, y en `business-questions.ts`.

### D. Semántica de flags enredada
- `required` y `critical` significan cosas distintas (obligatorio para terminar vs. bloquea la estrategia) y el invariante crítico⇒obligatorio se aplica en tres lugares (UI admin, API admin, `applyFieldConfigOverrides`). Está bien que se valide en los tres, pero la DEFINICIÓN debería estar en una sola función reutilizada.
- `missingCritical` en `onboarding-summary.tsx` ahora devuelve los **required** faltantes (se renombró el comportamiento sin renombrar la función). Confunde.

### E. Pequeños
- `emptyProductService` vive en `apply-analysis.ts` por conveniencia; es una fábrica de dominio (debería estar con `business-defaults.ts`).
- `withCurrent` (select tolerante) está en page.tsx; es una utilidad de UI reutilizable.
- `STEPS` tiene el índice 0 "Empecemos fácil" que ya no se usa (la fase `select` lo reemplazó), lo que obliga a `SUMMARY_STEP = STEPS.length - 1` y a comentarios desactualizados ("// 7").

## Arquitectura objetivo

```
src/features/onboarding/
  model/
    questions.ts          ← ÚNICO registro (hoy business-questions): id, section, step,
                            label/why/placeholder, input, options, required, critical,
                            get/apply/isMissing, canSuggest, domId (id de DOM del wizard)
    flags.ts              ← isRequired / isCritical / invariante crítico⇒obligatorio,
                            missingRequired(b) / missingCritical(b) (una sola implementación)
    sections.ts           ← QSection, labels, orden, sección→paso, sección→clave del resumen
    overrides.ts          ← applyFieldConfigOverrides + sync cliente (hoy en 2 archivos)
  flow/
    useOnboardingFlow.ts  ← fase, step, negocio, routeAfterImport, finish(), gates,
                            borrador, analytics. Sin JSX. Testeable.
    apply-analysis.ts, complete.ts, draft.ts (mover tal cual)
  ui/
    OnboardingPage.tsx    ← solo orquesta: <MethodSelect/> | <WebImport/> | <AiImport/> |
                            <Pending/> | <Wizard/>  (≈150 líneas)
    wizard/Step*.tsx      ← un archivo por paso; labels/placeholders leídos del registro
    pending/PendingScreen.tsx, PendingFlow.tsx  ← ambos renderizan con <QuestionField/>
    QuestionField.tsx, Summary.tsx, SignupModal.tsx, select-utils.ts (withCurrent)
```

Principios: `field-requirements.ts` **desaparece** (su única información propia —el paso del wizard y el id de DOM— pasa como `step`/`domId` a cada pregunta del registro; `onboarding-validation.getMissingRequiredFields(step)` se reimplementa como `questions.filter(q => q.step === step && isRequired(q) && q.isMissing(b))` + el detalle dinámico de productos). Los cuatro mapas dispersos se reducen a `sections.ts`. El objeto `miss` del resumen se calcula desde `missingCritical(b)` agrupado por sección.

## Plan por fases (un PR cada una, en este orden)

**Fase 0 — Red de seguridad (antes de mover nada).** Escribir tests con Vitest (o el runner que ya exista; si no hay, agregar Vitest mínimo) para el modelo puro, sin React: para un negocio vacío y para 3 negocios de ejemplo (uno por flujo) fijar como snapshot: `missingRequiredQuestions`, `missingCriticalQuestions`, `requirementsForStep(1..7)` (ids y orden), el resultado de `applyFieldConfigOverrides` con overrides (required:false, critical:true, textos, sort_order), `applyAnalysisToBusiness` con un JSON real de `/api/extract` guardado como fixture, y `isFieldRequired` para los 28 ids del wizard. Estos tests **no deben cambiar** en ninguna fase posterior salvo por renombres de import. Si uno cambia, hubo un cambio de comportamiento: parar y revisar.

**Fase 1 — Registro único.** Agregar `step` y `domId` a cada pregunta; reimplementar `getMissingRequiredFields` sobre el registro; borrar `field-requirements.ts` y sus 3 exports muertos; mover los 4 mapas a `sections.ts`; que el resumen calcule `miss` desde `missingCritical(b)`. Renombrar `missingCritical` (resumen) a lo que hace. Tests de Fase 0 verdes sin tocar.

**Fase 2 — Un solo render de inputs.** `PendingFlow` usa `QuestionField`. Borrar el switch duplicado. Mover todas las listas de opciones a `constants.ts` y referenciarlas desde el registro y los `Step*`. `withCurrent` a `select-utils.ts`.

**Fase 3 — Partir `page.tsx`.** Extraer `useOnboardingFlow` (lógica, sin JSX) y mover cada pantalla/paso a su archivo. `OnboardingPage.tsx` ≤ 200 líneas. Los `fetch` directos pasan a `src/lib/api.ts`. Eliminar los `as any` con tipos reales. Quitar el índice 0 fantasma de `STEPS` ajustando `SUMMARY_STEP` sin cambiar el texto "Paso N de 7".

**Fase 4 — Textos del wizard desde el registro.** Los `Step*` leen `label/placeholder/why` del registro (así las ediciones del admin aplican también al formulario manual). Verificar visualmente que cada label se muestra idéntico al actual.

## Verificación obligatoria en cada PR

- `npx tsc --noEmit` y `npm run build` sin errores; tests de Fase 0 verdes.
- Recorrido manual de los 3 flujos en el preview de Vercel del PR: web (con un sitio que deje obligatorios vacíos, p.ej. una landing simple), .md, y manual completo. En cada uno: llegar al Resumen, usar el lápiz de una sección, confirmar sin cuenta → modal → crear cuenta → aterrizar en `/strategy`.
- Modo edición desde Configuración: abrir, cambiar un campo, guardar sin regenerar estrategia.
- `/admin/onboarding-fields`: apagar un obligatorio y comprobar que ni pendientes ni el wizard lo piden; restaurar.
- `grep` de que no queden referencias a `field-requirements` ni a los mapas eliminados.

## Formato de entrega de cada fase

1. Antes de codear: lista de archivos a tocar y qué sale/entra de cada uno. Esperar OK.
2. Después: PR con descripción en español rioplatense (qué se movió, qué se borró, cómo se verificó) + la sección "Propuestas fuera de alcance" con lo que viste y NO hiciste.
