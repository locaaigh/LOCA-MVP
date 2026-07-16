# LOCA MVP — Agentes de Eva (IA)

Resumen de los agentes de IA del producto: qué hace cada uno, dónde interviene y cómo se relacionan.

Registro en código: `src/lib/ai/agents/index.ts`

---

## Visión general

LOCA usa **9 agentes especializados** bajo la persona **Eva** (`SYSTEM_EVA` en `src/lib/ai/prompts.ts`). Cada agente tiene **una responsabilidad única**, expone `run(input) → { data, meta }` y cumple la interfaz `Agent<TInput, TOutput>` (`src/lib/ai/shared/result.ts`).

**No se llaman entre sí.** Los orquesta la aplicación:

- Rutas API (`/api/strategy`, `/api/calendar`, etc.)
- Hook cliente `useGenerators()` (`src/lib/generators.ts`)
- Flujo guiado del producto: onboarding → estrategia → calendario → contenidos → imágenes

**Modo de trabajo:** mayormente **aislados**, encadenados **secuencialmente** por el producto. El output de un paso es **input del siguiente** (p. ej. estrategia → calendario → contenido), pero no hay un orquestador multi-agente que dialogue entre ellos.

**Proveedores de IA:**

| Tipo | Opciones | Config |
|------|----------|--------|
| Texto | Anthropic, OpenAI | `AI_TEXT_PROVIDER`, keys en env |
| Imagen | Gemini, OpenAI | `AI_IMAGE_PROVIDER`, keys en env |
| Fallback | Mocks | `src/lib/ai/mock.ts` si no hay API key o falla la IA |

---

## Mapa del flujo principal

```
Onboarding
  └─ websiteExtractAgent     (opcional: importar desde web)
  └─ productDescriptionAgent (opcional: describir producto/servicio)

Post-onboarding (flujo guiado)
  Business
    → strategyAgent
    → calendarAgent          (requiere Strategy)
    → contentAgent           (requiere Strategy + CalendarItem)
    → imageAgent             (requiere ContentItem con imagePrompt)

Paralelo / bajo demanda
  ├─ contentFeedbackAgent    (reescribe pieza con feedback del usuario)
  ├─ metaAdsAgent            (estrategia Meta Ads)
  └─ googleAdsAgent          (estrategia Google Ads)
```

---

## Agentes — detalle

### 1. `strategyAgent` — Estrategia de marketing

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/strategy.ts` |
| **Skill** | Arma el plan de marketing: posicionamiento, pilares de contenido, tono de voz, canales recomendados, objetivo del mes, CTAs, do's/don'ts, mensajes clave, mix de contenidos y próximas acciones. |
| **Input** | `Business` (+ `feedback` opcional para regenerar con instrucciones) |
| **Output** | `Strategy` |
| **Dónde se usa** | Fin de onboarding (post-signup), página Estrategia, regeneración con feedback de Eva |
| **API** | `POST /api/strategy`, `POST /api/strategy/start` |

---

### 2. `calendarAgent` — Calendario editorial

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/calendar.ts` |
| **Skill** | Genera N publicaciones del mes: fecha, canal, formato, pilar, objetivo, tema. |
| **Input** | `Business` + `Strategy` + `count` (+ `feedback` opcional) |
| **Output** | `CalendarItem[]` |
| **Dónde se usa** | Página Calendario, generación batch de contenidos del mes |
| **API** | `POST /api/calendar` |
| **Depende de** | Estrategia generada o aprobada |

---

### 3. `contentAgent` — Pieza de contenido (copy)

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/content.ts` |
| **Skill** | Redacta una pieza completa: título, hook, caption, CTA, hashtags, concepto visual, prompt de imagen, brief de foto/video. |
| **Input** | `Business` + `Strategy` + `CalendarItem` |
| **Output** | `ContentItem` (con `imageStatus: "pendiente"`) |
| **Dónde se usa** | Estudio de contenidos, generación batch del mes |
| **API** | `POST /api/content` |
| **Depende de** | Estrategia + ítem de calendario |

---

### 4. `imageAgent` — Imagen de la pieza

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/image.ts` |
| **Skill** | Genera la imagen creativa a partir del prompt y formato (4:5, 1:1, etc.). |
| **Input** | `prompt`, `format`, `label`, `concept` |
| **Output** | `imageUrl`, `provider`, `status` |
| **Dónde se usa** | Después de `contentAgent`, vía `useGenerators.generateContentWithImage` |
| **API** | `POST /api/image` (persiste en Supabase Storage) |
| **Nota** | No usa `withTextAgent`; llama directo al proveedor de imagen (Gemini u OpenAI). |

---

### 5. `contentFeedbackAgent` — Revisión de contenido

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/content-feedback.ts` |
| **Skill** | Reescribe una pieza según feedback del usuario (“más corto”, “más emocional”, “menos vendedor”, etc.). |
| **Input** | `Business` + `ContentItem` + `feedbackText` |
| **Output** | `ContentItem` actualizado + historial de feedback |
| **Dónde se usa** | Detalle de contenido, panel de feedback, burbuja de Eva |
| **API** | `POST /api/content/feedback` |
| **Trabajo** | Aislado; no dispara otros agentes automáticamente |

---

### 6. `websiteExtractAgent` — Autocompletado desde web

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/website-extract.ts` |
| **Skill** | Fetch de la URL + extracción heurística del HTML + enriquecimiento con IA (industria, productos, audiencia, brand kit, etc.). |
| **Input** | `url` |
| **Output** | `WebsiteAnalysis` (campos sugeridos con nivel de confianza) |
| **Dónde se usa** | Onboarding → flujo “Importar desde web” |
| **API** | `POST /api/extract` |
| **Trabajo** | Aislado al inicio del onboarding; alimenta el formulario, no genera estrategia directamente |

---

### 7. `productDescriptionAgent` — Descripción de producto/servicio

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/product-description.ts` |
| **Skill** | Sugiere descripción corta, larga, features y keywords para un producto/servicio en borrador. |
| **Input** | `Business` + `ProductService` (draft) |
| **Output** | `ProductDescriptionSuggestion` |
| **Dónde se usa** | Onboarding, paso Productos/Servicios |
| **API** | `POST /api/product-description` |
| **Trabajo** | Aislado, bajo demanda del usuario |

---

### 8. `metaAdsAgent` — Estrategia Meta Ads

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/ads-meta.ts` |
| **Skill** | Objetivo de campaña, audiencias, intereses, ángulos creativos, variantes de copy, headlines, CTAs, sugerencias de creativos y presupuesto. |
| **Input** | `Business` |
| **Output** | `MetaAdsStrategy` |
| **Dónde se usa** | Página Ads |
| **API** | `POST /api/ads` con `{ platform: "meta" }` |

---

### 9. `googleAdsAgent` — Estrategia Google Ads

| | |
|---|---|
| **Archivo** | `src/lib/ai/agents/ads-google.ts` |
| **Skill** | Campañas Search/Display, keywords, negativas, extensiones, copies. |
| **Input** | `Business` |
| **Output** | `GoogleAdsStrategy` |
| **Dónde se usa** | Página Ads |
| **API** | `POST /api/ads` con `{ platform: "google" }` |

---

## ¿Trabajan en conjunto o de manera aislada?

| Modo | Agentes | Cómo |
|------|---------|------|
| **Pipeline secuencial** | strategy → calendar → content → image | Orquestado por `useGenerators` y el flujo guiado; cada paso consume el output del anterior |
| **Aislados bajo demanda** | websiteExtract, productDescription, contentFeedback, metaAds, googleAds | Una llamada API por acción del usuario |
| **Regeneración con contexto** | strategy, calendar, contentFeedback | Reciben `feedback` o la pieza previa; no invocan otros agentes |

**No hay:**

- Orquestador multi-agente con diálogo entre agentes
- Memoria compartida entre agentes
- Llamadas agente-a-agente

La “memoria” del sistema es el objeto `Business` y los artefactos persistidos (`Strategy`, `CalendarItem`, `ContentItem`) en Supabase / store local.

---

## Infraestructura común

| Pieza | Rol |
|-------|-----|
| `SYSTEM_EVA` (`src/lib/ai/prompts.ts`) | Persona y reglas globales: español rioplatense, JSON, tono LOCA |
| `withTextAgent` (`src/lib/ai/agents/_shared.ts`) | Wrapper para agentes de texto: proveedor → JSON → fallback mock |
| `src/lib/ai/prompts.ts` | Prompts específicos por agente |
| `src/lib/ai/mock.ts` | Datos demo cuando no hay IA disponible |
| `src/lib/ai/service.ts` | Facade de compatibilidad (`generateBusinessStrategy`, etc.) |
| `src/lib/ai/providers/` | Adaptadores Anthropic, OpenAI, Gemini |

---

## Referencia rápida: API ↔ agente

| Ruta API | Agente |
|----------|--------|
| `POST /api/extract` | `websiteExtractAgent` |
| `POST /api/product-description` | `productDescriptionAgent` |
| `POST /api/strategy` | `strategyAgent` |
| `POST /api/strategy/start` | `strategyAgent` (generación larga post-signup) |
| `POST /api/calendar` | `calendarAgent` |
| `POST /api/content` | `contentAgent` |
| `POST /api/content/feedback` | `contentFeedbackAgent` |
| `POST /api/image` | `imageAgent` |
| `POST /api/ads` | `metaAdsAgent` o `googleAdsAgent` |

---

## Flujo guiado del producto (dónde encajan)

1. **Onboarding** — `websiteExtractAgent` (opcional) + `productDescriptionAgent` (opcional)
2. **Signup** — gate antes de consumir tokens de estrategia
3. **Estrategia** — `strategyAgent` (background o síncrono)
4. **Aprobación estrategia** — usuario revisa y aprueba
5. **Contenidos** — `calendarAgent` → `contentAgent` → `imageAgent` (batch o unitario)
6. **Ads** — `metaAdsAgent` / `googleAdsAgent` (independiente del pipeline de contenidos)
