# LOCA — Plan de medición y analytics

> Investigación y propuesta (2026-08-08). Objetivo: poder trackear y medir **todo** — landing + app — para mejorar y crecer con datos.
>
> **Estado 2026-08-09: Fase 1 IMPLEMENTADA Y CONFIGURADA** ✅ — PostHog SDK + pageviews + identify, wrapper `track()` (`src/lib/analytics.ts` + `src/lib/analytics-events.ts`), tabla `events` + `leads` (migración `0006_analytics.sql`), ~30 eventos client/server, UTM first-touch, fixes de `ai_usage_log`, leads persistidos, sitemap/robots, Meta Pixel y Google Ads cableados. Session replay activado. Dashboards en PostHog (proyecto 548392): [Funnel y activación](https://us.posthog.com/project/548392/dashboard/1974920) · [Producto](https://us.posthog.com/project/548392/dashboard/1974921) · [Tráfico y retención](https://us.posthog.com/project/548392/dashboard/1974922).
>
> ### ⏳ Pendientes concretos de tracking (al 2026-08-09)
> **Bloqueantes para que empiece a medir (deploy — Alan):**
> 1. Cargar las 5 env vars en Vercel (checklist exacto en `DEPLOY-PROD.md` §Analytics): PostHog key + host, Meta Pixel ID, Google Ads ID + label. Los valores ya están escritos en el checklist.
> 2. Correr `supabase/migrations/0006_analytics.sql` en Supabase SQL Editor (tablas `events`/`leads` + columnas de `ai_usage_log`).
> 3. Verificación post-deploy: ver `$pageview` en PostHog Activity, `/sitemap.xml` y `/robots.txt` respondiendo, y el pixel de Meta pasando a "activo" en Events Manager.
>
> **No bloqueantes (Sebastián, cuando quiera):**
> 4. ~~Search Console: verificar `heyloca.ai` por DNS~~ ✅ verificado (2026-08-09). Falta solo: post-deploy, enviar `https://heyloca.ai/sitemap.xml` en Search Console → Sitemaps.
> 5. Usar SIEMPRE links con UTM al compartir (`?utm_source=whatsapp&utm_medium=directo&utm_campaign=piloto`).
>
> **Cuando se activen campañas de ads:**
> 6. Meta Conversions API server-side con deduplicación (requiere access token de Events Manager → lo implementa Claude).
>
> **Fase 2 de producto (Claude, a pedido):** conectar `/metrics` a insights reales de Meta (endpoint ya existe), autosave del onboarding por paso, alertas y reporte semanal de KPIs.

---

## 1. Diagnóstico: qué hay hoy y qué falta

### Lo que ya existe (y sirve de base)
| Qué | Dónde | Estado |
|---|---|---|
| `ai_usage_log` (tokens/costo por agente IA) | `supabase/migrations/0005_ai_usage_log.sql` + `src/lib/ai-usage.ts` | ✅ Funciona, pero con huecos (ver abajo) |
| Campos de auditoría en `ContentItem` | `src/lib/types.ts` (`feedbackHistory`, `visualChangeCount`, `manuallyEditedFields`, `publishedAt`, `publishError`…) | ✅ Ya registran lo necesario para calcular tasa de aprobación "de una" — solo falta explotarlos |
| Endpoint de insights de Meta | `src/app/api/integrations/meta/insights/route.ts` | ⚠️ Implementado pero **ninguna UI lo consume**; `/metrics` muestra mocks |
| Overlay de uso de IA | `src/components/ai-usage-overlay.tsx` | Solo debug, no persiste |

### Huecos críticos detectados
1. **Cero analytics de comportamiento**: sin pageviews, sin eventos, sin funnels, sin session replay. Ninguna de las métricas pedidas (tiempo por página, navegación, botones, retención) se puede calcular hoy.
2. **UTMs se pierden**: `appHref()` (`src/lib/marketing/config.ts`) descarta el querystring al saltar `heyloca.ai → app.heyloca.ai`. Cuando corran ads, **no van a poder atribuir ni un signup a ninguna campaña**.
3. **El onboarding es invisible**: el `step` del wizard vive solo en `useState` del navegador. No hay forma de saber en qué paso abandona la gente (probablemente el dato más importante del MVP). Un refresh además pierde el progreso.
4. **`/api/strategy/start` no loguea uso de IA** — es el camino principal de generación de estrategia (el de cada usuario nuevo): su costo no queda registrado. Y cuando el proveedor falla y cae a mock, la llamada es invisible en ambas capas (el `warning` de `AiMeta` se descarta).
5. **Leads de `/contacto` solo viven en logs de Vercel** (`console.info` + webhook opcional). El TODO de persistirlos ya está escrito en el propio archivo.
6. **El demo desloguea y no captura nada**: `/demo` cierra sesión, no pide email, y el dashboard demo no tiene CTA de salida hacia signup.
7. `ai_usage_log` no guarda latencia, éxito/error, ni `content_id` — no se puede medir performance ni confiabilidad de la IA.

---

## 2. Arquitectura de medición propuesta

Dos capas complementarias (estándar de la industria):

### Capa A — Herramienta de product analytics: **PostHog** (recomendado)
Una sola herramienta cubre casi todo lo pedido:
- **Tiempo por página / navegación** → pageviews + pageleave automáticos, path analysis.
- **Qué mira y qué no** → session replay + heatmaps + scroll depth.
- **Qué botones toca** → autocapture de clicks (sin instrumentar cada botón) + eventos custom para los importantes.
- **Funnels** (landing → onboarding → signup → estrategia → contenido → publicación) con conversión y drop-off por paso.
- **Retención** → curvas D1/D7/D30, cohortes, DAU/WAU/MAU out-of-the-box.
- Extra: feature flags y A/B testing (para la fase de crecimiento), surveys (NPS) integradas.
- Free tier: 1M eventos/mes + 5k replays/mes — sobra para el piloto. SDK: `posthog-js` + `posthog-node`.

*Alternativas consideradas*: GA4 (gratis pero sin replay, funnels pobres, no product-analytics), Mixpanel/Amplitude (buenos pero sin replay nativo o más caros), Hotjar/Clarity (solo replay/heatmaps, habría que sumar otra herramienta igual). PostHog es la única que unifica todo; si prefieren replay separado, Microsoft Clarity es gratis e ilimitado como complemento.

### Capa B — Eventos first-party en Supabase: tabla `events`
Los eventos de **negocio** (aprobaciones, publicaciones, signups) también se guardan en nuestra DB, server-side, siguiendo el patrón ya probado de `logAiUsage` (insert best-effort con service role, RLS sin policies):

```sql
create table events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  business_id text,
  name text not null,            -- ej: 'content_approved'
  props jsonb default '{}',      -- ej: {"first_pass": true, "format": "post"}
  is_authenticated boolean default true,
  created_at timestamptz default now()
);
```

¿Por qué duplicar? (a) PostHog puede cambiar/limitar/perder datos — los KPIs del negocio (para el deck, para inversores) tienen que ser consultables en SQL propio; (b) los eventos server-side no dependen de adblockers ni de JS del cliente; (c) el header `x-loca-user-id` sin verificar y el modo demo contaminarían las métricas — el flag `is_authenticated` los filtra.

**Punto de captura estrella**: `POST /api/sync` — por ahí pasa **todo** cambio de estado del cliente. Diffeando el snapshot entrante contra la DB se derivan aprobaciones, ediciones y transiciones de flujo sin tocar el frontend (ojo: requiere diff contra estado previo, no un evento por request, porque el sync corre con debounce de 2.5s).

---

## 3. Catálogo completo: TODO lo que hay que medir

### 3.1 Adquisición (landing — heyloca.ai)
| Métrica | Cómo |
|---|---|
| Visitas por página (`/`, `/precios`, `/para/[slug]`, `/como-funciona`, `/funcionalidades`) | PostHog pageview |
| Fuente de tráfico: UTM, referrer, canal (orgánico/ads/directo) | PostHog + **fix de `appHref()` para preservar UTMs** |
| Tiempo por página + scroll depth (¿leen hasta precios? ¿hasta FAQ?) | PostHog pageleave + heatmaps |
| CTR de cada CTA ("Crear mi marketing", "Ver la demo", pricing, nav, footer) | Evento `cta_clicked {location, target}` |
| Conversión landing → `/onboarding` (por página de origen y por rubro `/para/[slug]`) | Funnel |
| Conversión landing → `/demo` + comportamiento dentro del demo + salida | Eventos `demo_started {profile}`, `demo_exited` |
| Leads Enterprise: envíos de `/contacto` (+ tasa de conversión de la página) | Evento + **persistir lead en Supabase** |
| Web vitals / velocidad (afecta SEO y conversión) | Vercel Speed Insights o PostHog web vitals |
| Posicionamiento SEO | Google Search Console (requiere `sitemap.ts` + `robots.ts`, hoy no existen) |

### 3.2 Activación — Onboarding (el funnel más importante)
| Métrica | Cómo |
|---|---|
| `onboarding_started` + **método elegido** (web / IA externa / manual) | Evento en `pickMethod()` |
| Import de web: intentos, éxito/fallo, tiempo de extracción | Evento en `analyzeWeb()` + server en `/api/extract` |
| **Tiempo y abandono por paso** (1–7 + resumen + pending flow) | Evento `onboarding_step_viewed {step}` / `onboarding_step_completed {step, seconds}` |
| Fallas de validación por campo (¿qué campo traba a la gente?) | Evento en `goToMissingField()` |
| Uso de "Que Eva sugiera" (por campo) y del pending flow (saltos vs completados) | Eventos en `suggest()`, `pending-flow.tsx` |
| **Tiempo total de completado del onboarding** (por método de entrada) | `onboarding_completed {seconds, method}` en `finish()` |
| Conversión resumen → "Confirmar y preparar estrategia" | Funnel |
| **Signup gate**: modal visto → cuenta creada (la conversión real) | Eventos en `onboarding-signup-modal.tsx` |
| Signup abandonado con draft guardado → ¿vuelve? (recuperación de draft) | Evento en `resumeOnboardingDraftIfAny()` |
| Confirmación de email (si aplica): enviado → confirmado | Server en `/auth/callback` |

### 3.3 Producto core — Estrategia
| Métrica | Cómo |
|---|---|
| Generaciones: iniciadas / completadas / fallidas + **duración** | Server en `/api/strategy/start` (ya tiene las 3 transiciones explícitas) |
| **Tasa de aprobación de estrategia** y tiempo hasta aprobar | Evento en `approve()` (`strategy/page.tsx:187`) |
| Aprobada "de una" vs con feedback; **qué secciones se editan más** (señal de calidad del prompt) | Evento `strategy_section_feedback {section}` |
| Nº de regeneraciones por negocio | Server `/api/strategy` |

### 3.4 Producto core — Contenidos (corazón del producto)
| Métrica | Cómo |
|---|---|
| Batch mensual: iniciado / completado / tiempo total / piezas OK vs con error de imagen | Eventos + server `/api/content`, `/api/image` |
| **Tasa de aprobación "de una"**: aprobado sin feedback, sin edición manual, sin cambio de imagen | Ya calculable con `feedbackHistory`, `manuallyEditedFields`, `visualChangeCount` — emitir `content_approved {first_pass: bool}` |
| Tasa de aprobación global, por formato (post/carrusel/reel/story), por canal, por pilar | props del evento |
| "Aprobar todo" vs aprobación pieza por pieza (¿revisan de verdad?) | Eventos separados |
| Feedback de copy: cuántos, qué tags/motivos, ciclos hasta aprobar | Server `/api/content/feedback` |
| Cambios de imagen: tasa de uso del cambio incluido, tags elegidos | Evento en `ContentVisualEditModal` |
| Rechazos y eliminaciones de piezas | Eventos + `DELETE /api/content/delete` |
| Tiempo en revisión (generado → aprobado) por pieza y por lote | Timestamps en eventos |
| Ediciones manuales de copy/fecha (señal de que el output no alcanza) | `lastManualEditAt` ya existe → evento |
| Exports (pack .zip, CSV) — proxy de publicación manual fuera de LOCA | Eventos en `runExport()` etc. |

### 3.5 Publicación y valor entregado (north star)
| Métrica | Cómo |
|---|---|
| **Conexión Meta**: iniciada / completada / cancelada / error (funnel OAuth) | Server en `connect` + `callback` |
| Publicaciones exitosas vs fallidas (+ motivo de error, plataforma) | Server en `/api/integrations/meta/publish` |
| Reintentos de publicación | Evento |
| **North star sugerida: piezas publicadas por negocio por semana** | SQL sobre `events` / `contents` |
| Desconexiones / desautorizaciones desde Facebook (churn de integración) | Server en `deauthorize` |
| Salud de tokens (vencidos, refresh fallido) | Cron `refresh-tokens` |
| **Performance de los posts publicados** (reach, engagement) — el "cierre del loop" que demuestra el valor de LOCA al cliente | Conectar `/metrics` al endpoint de insights **que ya existe** |

### 3.6 Retención y engagement
| Métrica | Cómo |
|---|---|
| **Retención D1 / D7 / D30** (cohortes semanales) | PostHog retention (automático con identify) |
| DAU / WAU / MAU + stickiness (DAU/MAU) | PostHog |
| Frecuencia y duración de sesiones; páginas más usadas dentro de la app | PostHog |
| Negocios "activos" (≥1 contenido aprobado o publicado en la semana) | SQL sobre `events` |
| Señales de churn: `business_deleted`, `reset_all`, desconexión Meta, 14 días sin login | Eventos + query |
| Ciclo mensual: ¿vuelven al mes siguiente a generar el nuevo batch? | Cohorte por `month_batch_generated` |

### 3.7 Economía y confiabilidad de la IA
| Métrica | Cómo |
|---|---|
| Costo de IA por usuario / por negocio / por pieza / por agente | `ai_usage_log` (ya existe) — **+ fix: loguear `/api/strategy/start`** |
| Costo de onboarding completo de un negocio (CAC técnico) | SQL |
| **Tasa de fallback a mock** (hoy invisible — crítico: usuarios podrían estar recibiendo contenido falso) | Agregar columna `is_mock` / `error` a `ai_usage_log` |
| Latencia por agente y por proveedor | Agregar `duration_ms` a `ai_usage_log` |
| Tasa de error de generación de imágenes por proveedor | Server `/api/image` (ya distingue `generada|error`) |
| Relación costo IA vs precio del plan (USD 89) — margen por cliente | SQL |

### 3.8 Negocio (cuando haya cobros)
Conversión trial→pago, MRR, churn de pago, LTV, CAC por canal (requiere las UTMs del punto 1), payback. Se apoyan en todo lo anterior — por eso las UTMs y el identify hay que dejarlos bien **ahora**.

### 3.9 Las métricas que pediste, resueltas
| Pedido | Solución |
|---|---|
| Tiempo por página | PostHog pageview+pageleave automático |
| Navegación | PostHog paths |
| Qué mira y qué no | Session replay + heatmaps + scroll depth |
| Dónde pasa más tiempo | Pageleave + replay |
| Qué botones toca | Autocapture + eventos custom en CTAs clave |
| Tasa de aprobación | Eventos `strategy_approved` / `content_approved` vs generados |
| Tiempo de completado de onboarding | `onboarding_started` → `onboarding_completed` (+ por paso) |
| Cuántos contenidos aprueban de una | `content_approved {first_pass}` usando los campos de auditoría ya existentes |
| Tasa de retención | PostHog retention D1/D7/D30 + cohorte mensual de batch |

---

## 4. Plan de acción por fases

### Fase 0 — Decisiones y cuentas (USTEDES, ~1 hora)
1. Crear cuenta en **PostHog Cloud** (región US o EU) → obtener `NEXT_PUBLIC_POSTHOG_KEY` y host.
2. Cargar las env vars en Vercel (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`).
3. Decidir si activan session replay desde el día 1 (recomendado: sí, con inputs enmascarados).
4. (Cuando corran ads) crear el Meta Pixel en el Business Manager de INFINIDAD.

### Fase 1 — Fundaciones (YO, directo sobre el código actual)
Todo esto lo puedo implementar ya, sin tocar funcionalidad (compatible con la regla de FUNCTIONALITY.md):
1. **SDK PostHog** (`posthog-js`) + provider en `src/app/layout.tsx`: pageviews con App Router, pageleave, autocapture. `identify()` en login/signup/logout (`src/lib/auth/session.ts`), con flag `is_demo` para excluir demo de las métricas.
2. **`src/lib/analytics.ts`**: wrapper `track(event, props)` tipado (catálogo de eventos como union type — evita typos y documenta el esquema), que manda a PostHog y, para eventos de negocio, al endpoint server.
3. **Migración `0006_events.sql`** + helper `logEvent()` server-side (mismo patrón que `logAiUsage`).
4. **Instrumentar el funnel crítico** (~25 eventos client-side): CTAs de landing, `pickMethod`, pasos del wizard, validaciones fallidas, signup modal, `approve()` de estrategia, deck de contenidos (aprobar/feedback/cambio visual), publicar.
5. **Eventos server-side** en: `/api/strategy/start` (started/completed/failed + duración), `/api/content`, `/api/content/feedback`, `/api/image`, `/api/integrations/meta/callback` y `publish`, `/api/sync` (diff de transiciones: `onboardingComplete false→true`, aprobaciones), `/api/contact`.
6. **Fix UTMs**: `appHref()` preserva querystring; capturar UTM/referrer en primera visita (localStorage) y adjuntarlos al signup (quedan en la persona de PostHog y en `events`).
7. **Fixes de `ai_usage_log`**: loguear `/api/strategy/start`; agregar `duration_ms`, `success`, `is_mock` (migración); registrar el fallback a mock.
8. **Persistir leads de `/contacto`** en Supabase (tabla `leads`).

### Fase 2 — Profundidad (YO código + USTEDES config, 1–2 semanas después)
1. Activar y revisar **session replay + heatmaps** (config en PostHog; yo dejo el masking de inputs listo en Fase 1).
2. **Dashboards y funnels en PostHog**: funnel maestro (landing→publish), funnel de onboarding por paso, retención, costos IA. Yo los defino; ustedes los revisan semanalmente.
3. **Conectar `/metrics` a los insights reales de Meta** (el endpoint ya existe; hoy la página muestra mocks). Cambio de producto chico pero cierra el loop de valor.
4. **Autosave del onboarding por paso** (persistir draft server-side): además de medir abandono, permite recuperar usuarios que abandonaron (⚠️ cambio de producto, no solo medición).
5. **Sitemap + robots + Search Console** para medir SEO de `/para/[slug]`.
6. **Meta Pixel + Conversions API** cuando arranquen ads (eventos `CompleteRegistration`, `Lead`).

### Fase 3 — Crecimiento continuo
1. **Alertas**: caída de tasa de aprobación, spike de fallos de IA/publicación, fallback a mock > 0.
2. **A/B testing** con feature flags de PostHog (copy de landing, orden de pasos del onboarding, cantidad de contenidos del batch).
3. **NPS/CSAT** con PostHog Surveys (post-aprobación del primer batch).
4. **Reporte semanal automático de KPIs** (query a `events` + `ai_usage_log` → email/Slack).
5. Cohortes de calidad: tasa de aprobación "de una" por versión de prompt (taggear `promptVersion` en los eventos para medir si los cambios de prompt mejoran la aprobación).

---

## 5. División de trabajo (resumen)

### Puedo hacer YO directo sobre lo que ya hay
- Todo el código de Fase 1 (SDK, wrapper, migraciones, ~25 eventos client + ~10 server, fix UTMs, fixes ai_usage_log, leads a Supabase).
- Definir dashboards/funnels en PostHog (con acceso).
- Fase 2: conectar `/metrics` a insights reales, autosave de onboarding, sitemap/robots.

### Necesitan hacer USTEDES
- Cuenta PostHog + env vars en Vercel (Fase 0).
- Meta Pixel en Business Manager (cuando corran ads).
- Search Console (verificación de dominio).
- Revisar los dashboards semanalmente y decidir con los datos 🙂.
- Legal: actualizar la política de privacidad mencionando analytics/replay (los legales ya son borradores pendientes de revisión de asesor).

### Decisiones abiertas
1. **¿PostHog US o EU?** (indiferente técnicamente; EU si les importa GDPR para clientes europeos futuros).
2. **¿Replay desde el día 1?** Recomiendo sí — con pocos usuarios del piloto, ver cada sesión vale oro.
3. **¿Banner de cookies?** Con PostHog en modo cookieless o con consentimiento implícito + política actualizada alcanza para AR; si apuntan a EU, banner.
