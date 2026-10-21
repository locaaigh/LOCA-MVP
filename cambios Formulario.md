# Cambios Formulario

Resumen de las modificaciones hechas sobre la sección de **Formulario (onboarding del negocio)**, a partir del feedback de octubre. Se organiza en los 6 puntos que acordamos. Todo se hizo preservando el comportamiento documentado (solo se cerraron huecos; nunca se aflojó un obligatorio) y el build de producción pasa OK.

> **Importante (alcance del punto 1):** por decisión de producto, la "inteligencia" se abordó **mejorando el prompt actual**, no reestructurando el pipeline en capas. La separación extractor/analista quedó anotada como **deuda técnica** para un salto futuro de escalabilidad.

---

## Punto 1 — Inteligencia del análisis de la web

**Qué se buscaba:** que Eva razone el negocio real en vez de copiar texto o inventar genéricos (ej: TSL caía en "handmade goods store" y "consumidores finales" sin revisión).

**Qué se hizo:**
- **Prompt reescrito** (`src/lib/ai/prompts.ts` → `websiteAnalysisPrompt`): pasa de "parser" a **analista de negocio**. Ahora:
  - Razona **quién paga** para decidir B2B/B2C (no asume B2C por default).
  - Distingue **producto vs servicio** con criterio (servicios = trabajo/tiempo/asesoría; no clasifica todo como producto).
  - Tiene **regla de "no inventar"**: si no está seguro, deja el campo vacío (vacío honesto) antes que un genérico.
  - Devuelve **confianza por campo** y, cuando no está seguro de industria / subcategoría / modelo de negocio, ofrece **3 a 5 opciones** para que el usuario elija.
  - Extrae además **temporadas, fechas especiales y "cosas a evitar"** (antes el prompt no las pedía y siempre quedaban pendientes).
- **Config de modelo** (`src/lib/ai/models.ts`): `temperature` del agente `website-extract` subió de `0.2` → `0.4` (razonar sin inventar). Queda comentado cómo subir a un modelo más potente con un one-liner si se quiere "más power".
- **Merge** (`src/lib/ai/agents/website-extract.ts`): usa la **confianza real** que reporta el modelo (antes era `"medium"` fijo), guarda las **opciones**, y mergea temporadas/fechas/avoid.
- **UI nueva** (`src/components/inputs.tsx` → `EvaOptionsChooser`, cableado en `src/app/onboarding/page.tsx`): cuando Eva no está segura, aparece **"Eva no está 100% segura, ¿cuál encaja mejor?"** con las 3-5 opciones en Industria, Subcategoría y Modelo de negocio.

---

## Punto 2 — Obligatorios que no funcionaban como tales (fuente única)

**Qué se buscaba:** se podía generar estrategia/contenido con campos obligatorios vacíos (estrategia floja), porque la definición de "obligatorio" vivía duplicada en dos archivos que divergían.

**Qué se hizo:**
- **Nuevo módulo = fuente única de verdad** (`src/lib/onboarding/field-requirements.ts`): declara cada campo obligatorio una sola vez con `{ id, label, step, critical, isMissing }`.
- `src/lib/onboarding-validation.ts` ahora **deriva** de ese registro (dejó de tener su lista duplicada).
- `src/lib/business-questions.ts`: el flag `critical` se **re-deriva** del registro, para que no pueda divergir nunca de la validación por paso.
- **Fix del hueco:** el gate final de estrategia (`finish()` en `page.tsx`) pasó de exigir solo los "críticos" a exigir **todo el set de obligatorios**, sin importar si entraste por web / IA / pendientes. Si falta algo, te **rutea al primer paso del wizard** incompleto y te marca el campo.
- El **modo edición** (desde configuración) conserva el gate indulgente de antes (editar no te obliga a completar todo de nuevo).

> Nota: cambiar un obligatorio sigue siendo tarea de dev + deploy (no hay backoffice de admin, según lo acordado), pero ahora se toca en **un solo lugar**.

---

## Punto 3 — Bug "Hot Sale / Cyber Monday" en "cosas a evitar"

**Qué pasaba:** fechas comerciales como "Hot Sale / Cyber Monday" o "Black Friday" aparecían en **cosas a evitar**. Son opciones legítimas de **temporadas/fechas** por industria (`src/lib/constants.ts`), no restricciones de marca → se colaban por alucinación/misrouting del modelo.

**Qué se hizo (defensa en 2 capas):**
- El **prompt** ya prohíbe explícitamente meter fechas/temporadas/promos en la avoid-list (Punto 1).
- **Sanitizador** en el merge (`website-extract.ts` → `sanitizeAvoidList`): descarta de la avoid-list cualquier ítem que coincida con una temporada/fecha conocida, **sin tocar restricciones reales** (ej: "No hablar de descuentos" se mantiene).

---

## Punto 4 — Temporadas y fechas especiales (DIFERIDO)

Acordamos verlo como **sub-proyecto aparte**, con un modelito en mano. Pendiente de diseñar:
- Opción explícita **"No tengo temporadas fuertes"**.
- Separar tipos de temporada (quarters / estación / comercial).
- Sumar **fecha real (date)** en fechas especiales, para que el motor de contenido no la olvide.

*(El prompt ya extrae temporadas/fechas desde la web — Punto 1 —, así que la base de datos para esto ya queda cargada.)*

---

## Punto 5 — Fixes de UX

- **"A quién le vende" / B2B:** el campo existía pero estaba mal nombrado ("Modelo de negocio") y sin estado. Se **relabeló a "A quién le vendés (modelo de negocio)"**, se le conectó el badge de estado y el selector de opciones de Eva (`page.tsx`, StepBasic).
- **Cartel "si vendés productos…"** (`page.tsx`, StepProducts): se mejoró el **contraste** (ya no es naranja sobre naranja) y ahora es **condicional** — se oculta si el negocio solo vende servicios.
- **Logos en varias versiones** (`src/components/brand-kit.tsx`): además de subir varios y marcar el "Principal", ahora cada logo tiene un **selector de variante** (Para fondo claro / oscuro, Ícono, Horizontal, etc.) para que Eva use el correcto.
- **Botón de guardar flotante** (`src/components/ui.tsx` → `Modal` con slot `footer`): el footer del wizard ya flotaba; se agregó una **barra de acciones fija al pie** del modal de edición de sección, para que "Guardar" quede siempre visible aunque la ficha scrollee (evita perder cambios).

---

## Punto 6 — Productos vs servicios

- **Mejor detección** producto/servicio: incluida en el prompt del Punto 1 (criterio explícito; deja de caer todo a "producto").
- **"REVISAR" ahora es obligatorio** (antes era invisible si no entrabas al paso): los productos sugeridos por Eva quedan en estado `shouldReview` y **bloquean** la estrategia hasta confirmarlos.
  - Se agregó un botón **"Confirmar"** en la tarjeta del producto (`src/components/product-service.tsx`) para una confirmación rápida sin abrir el editor completo.
  - Guardar un producto desde el editor también lo da por revisado.

---

## Archivos tocados

| Archivo | Punto(s) |
|---|---|
| `src/lib/ai/prompts.ts` | 1, 3, 6 |
| `src/lib/ai/models.ts` | 1 |
| `src/lib/ai/agents/website-extract.ts` | 1, 3 |
| `src/lib/types.ts` | 1 |
| `src/components/inputs.tsx` | 1 |
| `src/lib/onboarding/field-requirements.ts` *(nuevo)* | 2, 6 |
| `src/lib/onboarding-validation.ts` | 2, 6 |
| `src/lib/business-questions.ts` | 2 |
| `src/app/onboarding/page.tsx` | 1, 2, 5, 6 |
| `src/components/brand-kit.tsx` | 5 |
| `src/components/ui.tsx` | 5 |
| `src/components/product-service.tsx` | 6 |

## Cómo probarlo
1. Correr el onboarding con una web real y verificar: opciones 3-5 cuando Eva duda, B2B editable, sin genéricos inventados, temporadas/fechas extraídas, avoid-list sin fechas comerciales.
2. Intentar llegar a la estrategia con obligatorios vacíos (por web/IA) → debe rutear al paso incompleto.
3. Importar productos y confirmar que los "Revisar" bloquean hasta confirmarlos.

---

## UAT — Prueba en vivo del análisis web (Punto 1)

Prueba end-to-end contra una web real, con IA real (`provider: anthropic`, `claude-sonnet-4-6`).

**Caso de prueba:** `https://thoughtbot.com` — consultora de software (B2B, servicios). Se eligió un perfil equivalente al de TSL, donde el sistema viejo fallaba (detectaba B2C/"consumidores finales" y clasificaba todo como "producto").

**Resultado:** `mode: ai`, `confidence: 0.95`, degradación elegante verificada (cuando falló por falta de crédito, cayó a modo básico sin romper).

| Qué se probó | Esperado | Resultado obtenido | Estado |
|---|---|---|---|
| Detección B2B/B2C (fallo de TSL) | B2B | `A quién vende: B2B` [conf. alta] | ✅ PASS |
| Producto vs servicio | Servicios, no "todo producto" | 5 servicios (Desarrollo a medida, Team Augmentation, Design Sprints, AI/ML, Fractional Leadership) + 1 producto (ReadySetGo) | ✅ PASS |
| Industria / subcategoría + confianza | Categoría correcta, alta confianza | "Tecnología y Software" / "Consultoría y Desarrollo a Medida" [alta] | ✅ PASS |
| Avoid-list sin fechas comerciales (bug hot sale) | Solo restricciones reales de marca | "No muestran precios", "Evitan posicionarse como bajo costo/commodity", "No hablan de proyectos chicos" — cero fechas comerciales | ✅ PASS |
| Temporadas (no inventar) | Vacío si no hay señal | `None` (vacío honesto; una consultora no tiene temporada) | ✅ PASS |
| Fechas especiales (eventos propios) | Eventos reales del negocio | "Lanzamiento de ReadySetGo", "Reporte State of Software 2026" | ✅ PASS |
| Razonamiento de negocio | Análisis, no copiar tagline | *"Gana plata vendiendo servicios de consultoría a equipos que no pueden permitirse errores y valoran la experiencia por encima del precio."* | ✅ PASS |

**No ejercitado en esta corrida:** el selector de **3-5 opciones** — thoughtbot vino todo con confianza alta, por lo que (correctamente) no se ofrecieron alternativas. Para validar ese camino hace falta una web ambigua. **Pendiente de UAT:** opciones 3-5 con web ambigua, y la web real de TSL.

**Nota de infra:** la prueba requiere crédito en la cuenta de Anthropic; corrió con el modelo default `claude-sonnet-4-6`. Subir a un modelo más potente es un one-liner en `src/lib/ai/models.ts`.
