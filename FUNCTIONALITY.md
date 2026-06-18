# FUNCTIONALITY.md — Contrato funcional de LOCA

> Documento generado leyendo el código real (`src/`). Sirve como contrato para el
> rediseño de UI: **toda la lógica y el comportamiento descripto acá debe
> preservarse**. Solo cambia la capa de presentación.
>
> Stack: Next.js 14 (App Router) + TypeScript + Tailwind + Zustand (persistencia
> en `localStorage`, key `loca-store`). IA vía OpenAI con **fallback mock** cuando
> no hay `OPENAI_API_KEY`. Sin DB ni Supabase. Sin publicación real en redes.

---

## 1. INVENTARIO DE FEATURES / PANTALLAS

### Públicas (sin auth)

#### `/` — Home (`src/app/page.tsx`)
- **Qué hace:** landing. Hero "Tu marketing listo en minutos.", 3 beneficios, lista de features, "cómo funciona", footer.
- **Acciones:** links a `/onboarding` ("Crear mi marketing" / "Empezar"), `/demo` ("Probar demo"), `/login`.
- **Estados:** estática. Sin loading/error/vacío.

#### `/login` (`src/app/login/page.tsx`)
- **Inputs:** email (cualquiera, auth mock). **Output:** `login(email)` y navega a `/dashboard`.
- **Acciones:** "Probar en modo demo" → `loginDemo()` → `/dashboard`. Link a `/signup`.
- **Edge:** submit con email vacío no hace nada (`if (!email.trim()) return`).

#### `/signup` (`src/app/signup/page.tsx`)
- **Inputs:** nombre (opcional) + email (requerido). **Output:** `signup(email, name||emailPrefix)` → navega a `/onboarding`.
- **Edge:** email vacío no envía.

#### `/demo` (`src/app/demo/page.tsx`)
- **Qué hace:** al hidratar el store, llama `loginDemo()` y a los ~600ms navega a `/dashboard`.
- **Estados:** muestra loader `EvaLoading` "Preparando el modo demo…".
- **Edge:** espera `hydrated` antes de actuar.

#### `/onboarding` (`src/app/onboarding/page.tsx`) — **wizard de 8 pasos**
Paso 0 "Empecemos fácil", 1 Negocio, 2 Marca, 3 Identidad visual (Brand Kit), 4 Productos/Servicios, 5 Audiencia, 6 Objetivos, 7 Resumen.
- **Header sticky:** "Paso X de N · Nombre" + barra de progreso. Stepper de puntos navegable (solo a pasos ya vistos).
- **Scroll:** al cambiar de paso hace `scrollTo(0,0)`.
- **Barra inferior sticky:** "Atrás"/"Cancelar" + "Siguiente"/"Ver resumen" (oculta en el paso Resumen).
- **Paso 0 — 3 caminos (cards grandes):**
  - **"Usar mi IA"** (`external_ai_md`): muestra prompt copiable (`externalAiPrompt`), botón **Copiar prompt**, **Descargar plantilla .md vacía** (`emptyMdTemplate`), textarea para pegar Markdown y upload `.md`. Al "Analizar y completar" → `parseExternalMarkdown` → aplica al formulario + setea `externalAiImport`. Si `isAnalysisComplete` → salta al Resumen (paso 7); si no, sigue a paso 1. Banner de resultado con conteos.
  - **"Leer mi web"** (`website`): pregunta ¿tiene web? (Sí/No). Con URL → "Autocompletar con Eva" → `api.extractWebsite(url)` → `applyAnalysis`. Estados de extracción: idle/loading/done/error; banner de resultado con % de confianza y conteos (completados/revisar/faltan). Loading: "Eva está leyendo tu web…".
  - **"Completar manualmente"** (`manual`): mensaje y a completar pasos.
  - Bloque "Eva te ayuda en todo el proceso" debajo, secundario.
- **Estados por campo** (`fieldStatuses`): badge "Encontrado en tu web / Sugerido por Eva / Revisar / Falta completar / Editado por vos". Editar un campo sugerido lo pasa a "Editado por vos".
- **Campos con ayuda:** ejemplos por industria (`getFieldExample`), chips, `SearchableSelect` país/provincia, `ChannelSelector`, Sí/No con opciones condicionales (estacionalidad, fechas), `OptionCards`.
- **Brand Kit (paso 3):** colores editables (agregar/eliminar/marcar principal), tipografías (con sugerencias), logos detectados + subida (base64), mood/tono (chips), keywords, avoid list. Botón **"Que Eva elija por mí"** (`suggestBrandKit`); si ya había colores detectados pregunta "usar detectados" vs "nueva paleta".
- **Productos (paso 4):** cards con badge de origen (Encontrado en web / Confirmado por tu IA / Sugerido por Eva / Revisar) y "Sin precio" cuando no hay. Form editable con "Generar con Eva" (`api.productDescription`). Importador CSV (`ProductServiceImporter`). Estado vacío con acciones: "Que Eva sugiera" / "Agregar manualmente" / "Usar ejemplos de mi industria". Guardar minimiza en card.
- **Validación por paso** (`getMissingRequiredFields`, `validateOnboardingStep`): al "Siguiente" si faltan campos → toast "Te faltan algunos datos…", marca en rojo y hace scroll al primero. Campos obligatorios por paso documentados en `onboarding-validation.ts`.
- **Resumen (paso 7) — "Eva entendió esto de tu marca":** secciones con lápiz para editar **solo esa sección** en modal (Datos básicos, Productos, Audiencia, Propuesta de valor, Canales/marketing, Objetivos, Brand Kit, Datos comerciales, Keywords/avoid). "Cancelar" revierte (snapshot), "Guardar" vuelve al resumen. Secciones con faltantes obligatorios: **borde rojo + tag "Falta completar" + "Completar ahora"**. Banner arriba "Te faltan N datos" + **"Completar pendientes con Eva"** (`suggestPending`, no inventa nombre/ubicación/precio). Botón **"Confirmar y generar estrategia"** queda **deshabilitado** si `missingCritical` no está vacío (gate de calidad mínima: nombre, industria, descripción, ≥1 producto/servicio, audiencia, propuesta de valor, objetivo, canales, tono). Al confirmar → `finish()`: persiste el negocio (`onboardingComplete:true`, mapea color principal del Brand Kit a `brandColors`) y navega a `/strategy?generate=1`.

### App (auth-guard vía `AppShell`)

> `AppShell` (`src/components/app-shell.tsx`): sidebar (desktop) + topnav (mobile). Si `hydrated && !user` → redirige a `/login`. Muestra loader "Cargando…" hasta hidratar. Selector de negocio activo + "Crear nuevo negocio". Si no hay negocio activo y la ruta no es `/settings` → componente `NoBusiness` (CTA a `/onboarding`). Render del **EvaChatBubble** (elevado en `/strategy`, `/calendar`, `/content`). Orden de nav: Dashboard, Estrategia, **Estudio de contenidos, Calendario**, Métricas, Ads, Configuración.

#### `/dashboard` (`src/app/(app)/dashboard/page.tsx`)
- **Qué hace:** guía de próximo paso. Header (negocio + `AiStatusBadge`). `ProgressTracker` (Formulario→Estrategia→Contenidos→Calendario→Exportar). Card "Tu próximo paso" con CTA según `flow`: generar/revisar estrategia → generar contenidos (`/content?generate=1`) → revisar contenidos → "todo listo" (ver calendario). Resumen liviano (3 stats: publicaciones/contenidos/aprobados, solo si hay trabajo). Cards de acceso a estrategia/calendario/contenidos/ads.
- **Edge:** retorna `null` si no hay negocio.

#### `/strategy` (`src/app/(app)/strategy/page.tsx`)
- **Qué hace:** genera y muestra la estrategia. Auto-genera si `?generate=1` y no existe. Vista resumida visual (posicionamiento, objetivo del mes, audiencia, tono, canales, CTA, pilares, próximas acciones) + **"Ver estrategia completa"** (modal con todo). Exportar (`exportStrategyHtml` → ventana imprimible).
- **Aprobación:** barra sticky `StickyApproveBar` con `ApprovalActions`: **Aprobar estrategia** (verde) o **Modificar** (lápiz → modal `FeedbackPanel` con `STRATEGY_FEEDBACK`). Al aprobar → `setFlow(strategy:approved)` + navega a `/content?generate=1` (CTA "Ver contenidos →"). La burbuja de Eva (evento `eva:action` con `"modificar"`) abre el panel.
- **Estados:** loading `EvaLoading`, vacío (`EmptyState` "Generá tu estrategia").

#### `/content` — Estudio de contenidos (`src/app/(app)/content/page.tsx`)
- **Gate:** requiere `flow.strategy === "approved"`; si no, `EmptyState` "Primero aprobá la estrategia".
- **Auto-gen:** `?generate=1` + estrategia aprobada + sin contenidos → `generateMonthContents` (genera calendario interno auto-aprobado + todas las piezas). Loading "Eva está creando tus contenidos…" + progreso "Generando d/t…".
- **Tabs:** Revisión / Aprobados / Publicados / Biblioteca (con contadores por bucket vía `bucketOf`).
  - **Revisión:** `ContentReviewDeck` (cola pieza por vez). Muestra plataforma·formato (1 vez), preview, "Fecha y horario de publicación", caption, y acciones: **Aprobar** (verde, saca de cola y avanza), **Editar copy y fecha** (manual, sin IA), **Cambiar imagen/video** (avisa IA, vuelve a revisión). Al no quedar pendientes: "Todo aprobado 🎉" + CTA "Ver calendario". Barra sticky "Aprobar todo" con confirmación.
  - **Aprobados:** galería (no aprobar/rechazar). Acciones Ver, Copiar, **Reabrir edición** (confirmación → `needs_changes` → navega al detalle).
  - **Publicados:** galería con badge "Publicado"/"Fecha pasada". Ver, Copiar.
  - **Biblioteca interna:** galería con detalle técnico; ítems aprobados/publicados marcados "protegido". Exportar CSV (`exportContentsCsv`).
- **Estado vacío:** `EmptyState` "Generá los contenidos del mes".

#### `/content/[id]` — Detalle interno (`src/app/(app)/content/[id]/page.tsx`)
- **Qué hace:** editor completo interno (biblioteca). Desktop: imagen/preview izquierda, texto derecha. Campos editables: fecha/hora, título, hook, caption, body, CTA, texto sobre imagen, hashtags. Bloque Imagen (formato, prompt, generar/modificar imagen, copiar prompt, descargar). Video script / photo brief si existen. Decisión (Aprobar/Rechazar). `FeedbackPanel` "Modificar contenido" (IA, `CONTENT_FEEDBACK`). Eliminar pieza.
- **Protección:** si `isLocked` (aprobado/publicado): banner + edición deshabilitada (`fieldset disabled`), oculta Aprobar/Rechazar, oculta FeedbackPanel; botón **"Reabrir edición"** (modal de confirmación → `needs_changes`).
- **Burbuja de Eva:** `eva:action` `"imagen"`/`"modificar"` hace scroll a la sección.
- **Edge:** si no existe la pieza → card "No se encontró la pieza".

#### `/calendar` (`src/app/(app)/calendar/page.tsx`)
- **Gate:** requiere `flow.strategy === "approved"`; si no → `EmptyState`.
- **Qué muestra:** **solo contenidos aprobados/programados/publicados** (`bucketOf !== "revision"`), por fecha (`scheduledDate` o item de calendario). **Vista solo-calendario** (grilla mensual desktop, agenda por día mobile) — sin toggle lista. Filtros por canal/formato. Click en pieza → `/content/[id]`. Export CSV.
- **Estado vacío:** "Todavía no hay contenidos aprobados" + CTA a `/content`.

#### `/metrics` (`src/app/(app)/metrics/page.tsx`)
- **Qué hace:** dashboard de métricas **mock/demo** (`mockPerformance` + `analyzeContentPerformance`). Badge "Datos demo". Totales (alcance/impresiones/interacciones/engagement), mejores (canal/formato/día/contenido), insights didácticos, por canal, top contenidos.
- ⚠️ Siempre demo (no hay API de redes). Datos derivados de los contenidos del negocio (o genéricos si no hay).

#### `/ads` (`src/app/(app)/ads/page.tsx`)
- **Qué hace:** genera y muestra estrategia de **Meta Ads** y **Google Ads** (`generateAds`). Botón por plataforma "Generar"/"Modificar" + loading. Muestra objetivo, funnel, audiencias, intereses, ángulos, copies (copiables), headlines, CTAs, presupuesto, etc.
- **Edge:** no publica campañas reales (solo estrategia).

#### `/settings` (`src/app/(app)/settings/page.tsx`)
- **Qué hace:** cuenta (email + badge demo), estado de IA (`AiStatusBadge` + instrucciones `.env.local`), edición rápida del negocio activo (nombre, país, ciudad, color de marca), link a editar onboarding, lista de negocios (eliminar), **zona de peligro: "Borrar todo y cerrar sesión"** (`resetAll` → `/login`).

#### Burbuja de Eva (`src/components/eva-chat.tsx`)
- **Qué hace:** botón flotante abajo-derecha; panel con mensaje contextual por pantalla + acciones rápidas predefinidas. Algunas acciones emiten `window` event `eva:action` (`modificar`/`imagen`) que las páginas escuchan. No es chat IA real.

---

## 2. LÓGICA QUE NO SE DEBE TOCAR

### Estado global / data layer — `src/lib/store.ts`
- Zustand + `persist` con key **`loca-store`** (localStorage). NO cambiar la key ni la forma persistida sin migración.
- Slices: `user`, `businesses`, `activeBusinessId`, `strategies` (por businessId), `calendars` (por businessId), `contents` (array global), `adStrategies`, `flows` (por businessId), `hydrated`.
- Acciones: `signup`, `login`, `loginDemo`, `logout`, `upsertBusiness` (set activo), `deleteBusiness` (borra contenidos del negocio), `setActiveBusiness`, `getActiveBusiness`, `setStrategy`, `setCalendar`, `updateCalendarItem`, `upsertContent`, `updateContent` (merge + `updatedAt`), `deleteContent`, `setAdStrategy` (1 por plataforma/negocio), `getFlow`/`setFlow`, `resetAll`.
- Factories: `emptyBusiness`, `emptyBrandKit`, `emptyBusinessIntelligence`. Selectores: `useActiveBusiness`, `useFlow`. Constante `EMPTY_FLOW`.

### Flujo guiado (orden + gates)
- **Formulario → Estrategia → (genera contenidos) → Revisión/Aprobación → Calendario.**
- `flow.strategy/calendar/content`: `draft | pending_review | approved | needs_changes`.
- Estrategia aprobada habilita generación de contenidos. El **calendario de ideas es interno y auto-aprobado** (`generateMonthContents`), NO es un paso visible del cliente.
- Gate de contenidos: estrategia aprobada. Gate de generación de estrategia: `missingCritical` vacío (calidad mínima) — `onboarding-summary.tsx`.

### Generadores — `src/lib/generators.ts` (hook `useGenerators`)
`generateStrategy`, `generateCalendar`, `generateMonthContents`, `generateContentForItem`, `generateAllContent`, `generateImage`, `applyFeedback`, `generateAds`. Cada uno orquesta API + store. `generateMonthContents` usa `useStore.getState()` para leer estado fresco entre pasos. **Preservar firmas y efectos sobre el store/flow.**

### Capa API cliente — `src/lib/api.ts`
`api.{status,strategy,calendar,content,feedback,image,metaAds,googleAds,extractWebsite,productDescription}`. Endpoints `POST` (excepto `status` `GET`). Forma de respuesta `{ data, meta }` (salvo `image` que es objeto plano y `status`). NO cambiar contratos.

### Endpoints (route handlers, `runtime=nodejs`, `dynamic=force-dynamic`)
- `GET /api/status` → `{hasOpenAI, textModel, imageModel}`.
- `POST /api/strategy` `{business, feedback?}` → `{data:Strategy, meta}`.
- `POST /api/calendar` `{business, strategy, count, feedback?}` → `{data:CalendarItem[], meta}`.
- `POST /api/content` `{business, strategy, calendarItem}` → `{data:ContentItem, meta}`.
- `POST /api/content/feedback` `{business, item, feedback}` → `{data:ContentItem, meta}`.
- `POST /api/image` `{prompt, format, label?, concept?}` → `{imageUrl, prompt, provider, status, error?}`.
- `POST /api/ads` `{business, platform}` → estrategia meta/google.
- `POST /api/extract` `{url}` → `{data:WebsiteAnalysis, meta}` (catch nunca rompe: devuelve análisis vacío válido).
- `POST /api/product-description` `{business, draft}` → `{data:ProductDescriptionSuggestion, meta}`.

### Servicio IA + fallback — `src/lib/ai/*`
- `service.ts`: cada función usa OpenAI si `hasOpenAI()`, si no o si falla → **fallback mock** (`mock.ts`). Normaliza/valida la respuesta del LLM (canales/formatos válidos, arrays, strings). **No romper el fallback ni la normalización.**
- `openai.ts`: `hasOpenAI`, `chatJson` (JSON mode, `TEXT_MODEL`/`IMAGE_MODEL` por env), imágenes.
- `prompts.ts`: prompts de Eva (incluye `brandContext` que inyecta Brand Kit/BI en contenido e imagen). `website.ts`: fetch + crawl (≤5 páginas internas, timeouts), extracción determinística (colores/fuentes/redes/contacto/ofertas) + `buildBasicAnalysis`/`buildBrandKitFromRaw`/`extractOfferings`. `mock.ts`: generadores mock contextuales (incluyen `scheduledDate/scheduledTime`, status inicial `pending_review`).

### Lógica de negocio en `src/lib/`
- `content-status.ts`: `isApproved/datePassed/isPublished/bucketOf/isLocked` (clasificación de tabs y protección). **Regla:** publicado = `published`/`publicado_manualmente` o aprobado con fecha pasada.
- `onboarding-validation.ts`: campos obligatorios por paso + scroll/resaltado.
- `md-import.ts`: `externalAiPrompt`, `emptyMdTemplate`, `parseExternalMarkdown` (interpreta `FALTA_COMPLETAR`/`INCOMPLETO`/`REVISAR`/`INFERIDO`, crea productos/servicios), `isAnalysisComplete`.
- `eva-suggest.ts`: `suggestPending` (sugiere campos seguros, NUNCA precio/nombre/ubicación/razón social).
- `brand-suggest.ts`: `suggestBrandKit` (paleta/tipografía/tono por industria).
- `metrics.ts`: `mockPerformance`, `analyzeContentPerformance`. `feedback.ts`: listas `STRATEGY_/CALENDAR_/CONTENT_FEEDBACK` + `applyStructuredFeedback`. `csv-import.ts`: `parseProductsCsv`. `geo.ts`, `examples.ts`, `constants.ts`: datos.
- `exports.ts`: `exportCalendarCsv`, `exportContentsCsv`, `exportStrategyHtml`. `utils.ts`: `cn, uid, nowIso, formatDate(Short), weekdayEs, toCsv, downloadFile, downloadDataUrl, copyToClipboard, spreadDates`. `placeholder.ts`: `brandedPlaceholder` (SVG data URL), `openAiSize`, `IMAGE_DIMENSIONS`.
- `types.ts`: **modelo de datos** (Business, Strategy, CalendarItem, ContentItem, BrandKit, BusinessIntelligence, WebsiteAnalysis, métricas, statuses…). NO cambiar formas sin migración del store persistido.
- `demo.ts`: `DEMO_USER`, `DEMO_BUSINESSES` (Café Bruma, Casa Nativa). Mantener intactos para modo demo.

### Reglas transversales que deben sobrevivir
- **Eva no inventa:** datos inciertos → suggested/review/missing; nunca precio/ubicación/nombre inventados.
- **Edición manual (copy/fecha/hora) no usa IA** ni consume créditos. Cambiar imagen/concepto visual sí puede usar IA y **vuelve a revisión** si estaba aprobado.
- **Reabrir edición** pide confirmación y pasa a `needs_changes`.
- **Persistencia local**: todo vive en `localStorage`; "Borrar todo" resetea.
- Eventos `window` `eva:action` (`modificar`/`imagen`) entre la burbuja y las páginas.

---

## 3. PRESENTACIÓN vs LÓGICA

### Solo presentación (seguros de reescribir libremente)
- `src/components/brand.tsx` (Logo, EvaAvatar).
- `src/components/ui.tsx` ⚠️ contiene **primitivos + hooks**: `Button/Card/Badge/Input/Textarea/Select/Field/ChipSelect/Modal/EmptyState/PageHeader/SectionLabel` (presentación), pero `useToast` y `EvaLoading` son utilitarios de UI con lógica mínima — mantener su API (`useToast()` → `{show, node}`).
- `src/app/page.tsx` (Home), `src/app/globals.css`, `tailwind.config.ts`.
- `src/components/content-preview.tsx` (render visual de una pieza; usa `brandedPlaceholder`).
- `src/components/metrics-dashboard.tsx` (render; recibe `MetricsSnapshot` ya calculado).

### Mixto — presentación + estado/lógica de UI (reescribir con cuidado, preservar comportamiento)
- `src/components/app-shell.tsx`: **auth-guard + redirección + selector de negocio + render de EvaChatBubble**. Preservar la lógica de guard/hydration/nav.
- `src/components/flow.tsx`: `ProgressTracker`, `ApprovalActions`, `StickyApproveBar`, `FeedbackPanel`, `buildFlowSteps`/`toStepStatus`. `buildFlowSteps` tiene **lógica de orden y estados** — preservar.
- `src/components/eva-chat.tsx`: contextos por pantalla + emisión de `eva:action`. Preservar eventos y acciones.
- `src/components/inputs.tsx`: `SmartSelect/SearchableSelect/Country/Region`, `OptionCards`, `YesNoChoice`, `ChannelSelector?`, `FieldStatusBadge`, `HelpField` (con `status`). Lógica de búsqueda/selección y mapeo de estados.
- `src/components/channel-selector.tsx`, `src/components/brand-kit.tsx`, `src/components/product-service.tsx`, `src/components/content-review.tsx`, `src/components/onboarding-summary.tsx`: **componentes con lógica de negocio embebida** (estados, edición manual sin IA vs IA, suggest, validaciones, badges de origen). Reescribir la UI pero **preservar handlers, llamadas a store/generadores/parsers y reglas** (ej. no inventar precio, vuelve a revisión al cambiar visual, snapshot/cancel en edición de sección).
- **Páginas** `src/app/(app)/*/page.tsx` y `src/app/onboarding/page.tsx`, `login/signup/demo`: contienen orquestación (auto-gen, gates, navegación, toasts). Reescribir markup pero **mantener** los efectos, condiciones de gate, navegaciones y llamadas.

### No tocar (lógica pura / data)
- Todo `src/lib/**` y `src/app/api/**` (store, generators, api, ai/*, content-status, md-import, eva-suggest, brand-suggest, metrics, feedback, csv-import, geo, examples, constants, exports, utils, placeholder, types, demo).

---

## 4. CHECKLIST DE VERIFICACIÓN (post-rediseño)

### Auth / navegación
- [ ] `/login` con email entra a `/dashboard`; "modo demo" carga negocios demo.
- [ ] `/signup` crea usuario y va a `/onboarding`.
- [ ] `/demo` carga Café Bruma + Casa Nativa y va a `/dashboard`.
- [ ] Sin sesión, entrar a una ruta `(app)` redirige a `/login` tras hidratar.
- [ ] Sidebar/topnav: orden Dashboard, Estrategia, Estudio de contenidos, Calendario, Métricas, Ads, Configuración. Selector de negocio cambia el activo. "Crear nuevo negocio" → `/onboarding`.
- [ ] Sin negocio activo (fuera de settings) se muestra `NoBusiness`.

### Onboarding
- [ ] Paso 0 muestra **3 cards** (IA externa / web / manual) como protagonistas; bloque "Eva te ayuda" debajo.
- [ ] "Leer mi web": URL + "Autocompletar con Eva" completa campos, muestra % y conteos; estados loading/error amables; no rompe si falla.
- [ ] "Usar mi IA": **Copiar prompt** y **Descargar plantilla .md vacía** funcionan; pegar/subir `.md` parsea y completa; `.md` completo salta al resumen; incompleto deja pendientes.
- [ ] Campos muestran estado (encontrado/sugerido/revisar/falta/editado); editar un sugerido lo marca "Editado por vos".
- [ ] Brand Kit: editar/agregar/eliminar colores, marcar principal, tipografías, subir logo, **"Que Eva elija por mí"** (con elección usar-detectados vs nueva paleta).
- [ ] Productos: cards con badge de origen y **"Sin precio"** cuando no hay; no se inventan precios; importar CSV; estado vacío con 3 acciones; guardar minimiza.
- [ ] Validación por paso bloquea avanzar, resalta faltantes y hace scroll al primero.
- [ ] Cambiar de paso hace scroll arriba; header sticky con progreso visible.
- [ ] Resumen: cada sección con lápiz → edita en modal → "Guardar" vuelve / "Cancelar" revierte.
- [ ] Resumen: secciones con faltantes en rojo + "Completar ahora"; banner "Te faltan N datos" + **"Completar pendientes con Eva"** (no inventa nombre/ubicación/precio).
- [ ] **"Confirmar y generar estrategia"** deshabilitado si falta calidad mínima; al confirmar persiste negocio y va a `/strategy?generate=1`.

### Estrategia
- [ ] Auto-genera con `?generate=1`; loading "Eva está preparando…".
- [ ] Vista resumida + "Ver estrategia completa" (modal); Exportar abre HTML imprimible.
- [ ] **Aprobar estrategia** (verde) → flow approved + va a `/content?generate=1`. **Modificar** abre panel de feedback (IA) y regenera.

### Contenidos
- [ ] Gate: sin estrategia aprobada muestra "Primero aprobá la estrategia".
- [ ] Al entrar con `?generate=1` genera **piezas completas** (fecha/hora/canal/formato/imagen-o-placeholder/copy) en `pending_review`; progreso visible.
- [ ] Tabs Revisión/Aprobados/Publicados/Biblioteca con contadores.
- [ ] Revisión: una pieza por vez; plataforma una sola vez; fecha/horario bajo el visual; **Aprobar** la saca y avanza; "Todo aprobado" + CTA calendario; "Aprobar todo" con confirmación.
- [ ] **Editar copy y fecha** no usa IA (marca editado manual). **Cambiar imagen/video** avisa IA y, si cambia el visual de algo aprobado, vuelve a revisión.
- [ ] Aprobados: sin aprobar/rechazar; **Reabrir edición** confirma y lleva al detalle editable.
- [ ] Publicados: badge publicado/fecha pasada; no aprobar.
- [ ] Biblioteca: detalle técnico visible para equipo; ítems aprobados/publicados protegidos. Exportar CSV.
- [ ] Detalle `/content/[id]`: edición completa; si aprobado/publicado, edición bloqueada hasta "Reabrir edición"; eliminar pieza funciona.
- [ ] La vista cliente (Revisión) **no** muestra prompts/briefs/metadata.

### Calendario
- [ ] Solo muestra contenidos aprobados/programados/publicados; vista calendario (mes/agenda) sin toggle lista; filtros canal/formato; click abre detalle; export CSV.
- [ ] Vacío explica "Todavía no hay contenidos aprobados" + CTA a `/content`.

### Métricas / Ads / Settings
- [ ] `/metrics`: muestra datos demo con badge "Datos demo", totales, mejores e insights.
- [ ] `/ads`: genera/modifica estrategia Meta y Google; copies copiables; no publica real.
- [ ] `/settings`: edita negocio activo (nombre/país/ciudad/color), lista/elimina negocios, "Borrar todo y cerrar sesión" resetea y va a `/login`.

### Transversal
- [ ] Burbuja de Eva visible (elevada en estrategia/calendario/contenidos); acciones rápidas funcionan y disparan `eva:action`.
- [ ] Modo demo/mock funciona **sin** `OPENAI_API_KEY` (placeholders + mocks); con key usa IA real y cae a mock si falla.
- [ ] Datos persisten en `localStorage` (`loca-store`) entre recargas.
- [ ] `npm run typecheck` y `npm run build` pasan.

---

⚠️ **No verificable solo desde el código (confirmar manualmente):**
- Comportamiento real de fetch/crawl de webs externas (depende de red/CORS del sitio).
- Generación de imágenes reales con OpenAI (requiere API key válida).
- Métricas siempre son demo; no hay integración real de redes.
