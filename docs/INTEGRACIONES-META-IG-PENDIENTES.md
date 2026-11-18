# Integraciones Meta + Instagram + LinkedIn — pendientes de dev y deploy

> Actualizado: 2026-08-12. Documento de trabajo para dejar operativos los dos flujos
> de conexión (Facebook Login e Instagram Login) y pasar App Review.
>
> **Dominio de producción para callbacks: `app.heyloca.ai`.**
>
> ⚠️ **CAMBIO respecto de la versión del 2026-08-11**, que decía `heyloca.ai` sin
> subdominio. El 2026-08-12 se activó el split de dominios (`heyloca.ai`/`www` =
> web de marketing, `app.heyloca.ai` = plataforma) y los callbacks se mudan al
> subdominio de la plataforma. Razones:
>
> 1. `/api/integrations/*/connect` llama a `getSessionUserId()`, o sea **necesita la
>    cookie de sesión de Supabase**, que está scopeada a `app.heyloca.ai`. El flujo
>    solo puede iniciarse desde ahí.
> 2. El apex `heyloca.ai` hoy hace 308 a `www.heyloca.ai`. Un callback ahí haría
>    viajar el `code` de OAuth por dos redirects antes de llegar al handler, y otros
>    dos para volver a `/settings`. Apuntando al subdominio son cero saltos.
>
> **Sebastián: hay que actualizar las URLs ya cargadas en los dashboards** — ver
> §4 y §5, marcadas con 🔄.

---

## 1. Flujo Facebook Login (existente) — cambios de código

- [ ] **`config_id` en el diálogo OAuth.** La app de Meta es tipo *Business* →
      debe usar Facebook Login for Business. En `src/lib/meta/oauth.ts`
      (`buildAuthUrl`) enviar `config_id` en lugar de `scope`.
      La *configuration* se crea en el dashboard: **Inicio de sesión con Facebook →
      Configuraciones → Crear** (token de usuario, con los 9 permisos aprobables).
      Nueva env var: `META_LOGIN_CONFIG_ID`.
- [ ] **Agregar `read_insights` a `DEFAULT_SCOPES`** en `src/lib/meta/config.ts`
      (el código ya lee insights de página en `src/lib/meta/insights.ts:51` pero el
      scope no se pedía). Incluirlo también en la configuration del dashboard.
- [ ] **Subir `META_GRAPH_VERSION`** de `v21.0` a `v23.0`+ (v21 deprecia ~oct 2026).
      ⚠️ Al subir, verificar que las métricas de `src/lib/meta/insights.ts` sigan
      existiendo — Meta deprecó varias de Page Insights entre v21 y v23. Si alguna
      desapareció, el endpoint devuelve error y la UI de métricas queda vacía.

## 2. Flujo Instagram Login (nuevo) — módulo completo a construir

App de Instagram dentro de la app de Meta: **LOCA-IG**, App ID `1011168477969085`.

- [ ] `src/lib/instagram/` espejando la estructura de `src/lib/meta/`:
  - OAuth: authorize en `https://www.instagram.com/oauth/authorize` con
    `response_type=code` y **solo** estos scopes:
    `instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights`.
    ⚠️ La "URL de inserción" que genera el dashboard incluye también
    `instagram_business_manage_messages` y `instagram_business_manage_comments`;
    NO usarlos en el código — no se van a pedir en App Review y harían fallar el
    login de usuarios reales una vez publicada la app.
  - Intercambio de code: `POST https://api.instagram.com/oauth/access_token`
    → token corto; canjear por long-lived (60 días):
    `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token`.
  - Refresh: `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`
    (antes de los 60 días) — extender el cron de refresh existente.
  - Publish: mismo flujo de contenedor que Meta pero contra `graph.instagram.com`
    (`POST /{ig-user-id}/media` → `POST /{ig-user-id}/media_publish`).
  - Insights: `GET /{ig-user-id}/insights` y `GET /{media-id}/insights` en
    `graph.instagram.com`.
- [ ] Rutas API:
  - `GET  /api/integrations/instagram/connect` — redirige al authorize.
  - `GET  /api/integrations/instagram/callback` — intercambia code, guarda conexión.
  - `POST /api/integrations/instagram/deauthorize` — signed_request, revoca tokens.
  - `GET/POST /api/integrations/instagram/webhook` — GET: handshake de verificación
    (responder `hub.challenge` si `hub.verify_token` == `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`);
    POST: recibir eventos (por ahora solo loguear/200).
- [ ] Campo `provider` (`facebook` | `instagram` | `linkedin`) en las conexiones
    (`src/lib/meta/repository.ts`) + migración SQL. **Ojo:** la tabla
    `meta_connections` tiene hoy PK `(user_id, business_id)`, o sea un negocio solo
    puede tener UNA conexión. Hay que redefinir la PK a
    `(user_id, business_id, provider)`, generalizar las columnas específicas de Meta
    (`page_id`/`ig_user_id` no aplican a LinkedIn), y actualizar el `onConflict` del
    upsert, los filtros de `getConnection`/`deleteConnection` y la query del cron en
    `refresh.ts`, que hoy barre todas las filas activas sin distinguir proveedor.
- [ ] Settings: segundo botón "Conectar con Instagram" (para cuentas IG
    profesionales sin Facebook). El publish/insights elige el cliente según
    `provider` de la conexión. El componente `src/components/meta-connection-card.tsx`
    hoy tiene hardcodeado el query param de retorno `?meta=`; hay que parametrizarlo
    por proveedor.

## 3. Env vars a cargar en Vercel (producción)

| Variable | Valor |
|---|---|
| `META_OAUTH_REDIRECT_URI` | `https://app.heyloca.ai/api/integrations/meta/callback` ✅ cargada 2026-08-12 |
| `META_LOGIN_CONFIG_ID` | `814070598398388` |
| `INSTAGRAM_APP_ID` | `1011168477969085` |
| `INSTAGRAM_APP_SECRET` | (dashboard → API de Instagram → "Clave secreta de la app de Instagram" → Mostrar) |
| `INSTAGRAM_OAUTH_REDIRECT_URI` | `https://app.heyloca.ai/api/integrations/instagram/callback` |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | `844f9e7b5925fb7ff971dd3b762580fb987d70f0a4635add48a5a8baa27714a2` |

## 4. Dashboard de Meta — checklist (lado Sebastián)

### Ya hecho
- [x] App creada (tipo Business), empresa verificada.
- [x] Privacy / Terms / Data deletion URLs actualizadas con dominio real.
- [x] Permisos innecesarios eliminados de la revisión.

### URLs — 🔄 TODAS CAMBIAN A `app.heyloca.ai`
- 🔄 Facebook Login → Settings → Valid OAuth Redirect URIs:
  `https://app.heyloca.ai/api/integrations/meta/callback`
- 🔄 Facebook Login → Settings → Deauthorize Callback URL:
  `https://app.heyloca.ai/api/integrations/meta/deauthorize`
- 🔄 Instagram Login (paso 4 del wizard) → Redirect URI:
  `https://app.heyloca.ai/api/integrations/instagram/callback`
- 🔄 Instagram Login → Deauthorize: `https://app.heyloca.ai/api/integrations/instagram/deauthorize`
- Instagram Login → Data deletion: `https://app.heyloca.ai/legal/meta-data-deletion`
- App Domains: `heyloca.ai` alcanza — la doc de Meta dice que cubre "domains **and
  subdomains**". Solo restringe desde dónde se puede hacer Facebook Login; no tiene
  relación con dónde están alojadas las URLs legales.

### Para poder hacer el primer login en producción (orden)
1. ~~Sebastián: crear la **configuration** de FB Login for Business (9 permisos)~~ ✅ Hecho — `config_id`: `814070598398388`.
2. 🔄 Sebastián: **reemplazar las URLs de FB Login por las de `app.heyloca.ai`** (redirect +
   deauthorize), verificar App Domains, ícono/categoría/email en Básica.
3. Sebastián: agregar cuentas de prueba (suya, dev, IG profesional) como **testers** en Roles. ⚠️ Con la app sin publicar, SOLO admins/devs/testers pueden conectar cuentas.
4. Dev: implementar §1 y §2, cargar env vars §3, deploy.
5. Probar login FB en producción → grabar screencast → enviar Revisión 1.
6. (Cuando esté el módulo IG) webhook + login IG → screencast → Revisión 2.
7. Con revisiones aprobadas → botón **Publicar** (recién ahí conectan clientes reales).

### Pendiente (bloqueado por deploy del dev)
- [ ] **Webhook IG (paso 3 del wizard)** — recién después del deploy del módulo IG:
  - URL de devolución de llamada: `https://app.heyloca.ai/api/integrations/instagram/webhook`
  - Token de verificación: `844f9e7b5925fb7ff971dd3b762580fb987d70f0a4635add48a5a8baa27714a2`
  - Tocar "Verificar y guardar" (Meta hace un GET en vivo; antes del deploy falla).
- [x] Crear la **configuration** de Facebook Login for Business → `config_id`:
  `814070598398388` (ya cargado en la tabla de env vars, §3).
- [ ] Agregar cuenta IG profesional como **evaluador de Instagram** (Roles) y
  aceptar la invitación desde la app de IG.

### App Review
- **Revisión 1 — flujo Facebook (9 permisos):** `public_profile`, `pages_show_list`,
  `pages_read_engagement`, `pages_manage_posts`, `read_insights`, `instagram_basic`,
  `instagram_content_publish`, `instagram_manage_insights`, `business_management`
  (obligatorio del caso de uso). Descripciones en inglés: ver conversación con
  Claude del 2026-08-11 (o pedirlas de nuevo).
- **Revisión 2 — flujo Instagram Login (3 permisos):** `instagram_business_basic`,
  `instagram_business_content_publish`, `instagram_business_manage_insights`.
  Requiere el módulo IG deployado + screencast propio.
- Cada revisión: screencast del flujo completo en `app.heyloca.ai` + credenciales de
  una cuenta LOCA de prueba sin paywall.

## 5. LinkedIn — publicar en páginas de empresa (Community Management API)

App en developer.linkedin.com asociada a la página de empresa de **INFINIDAD**
(decisión de PLAN-etapa2: página establecida = mejor perfil ante el review de
LinkedIn; misma entidad legal que el negocio verificado de Meta. El usuario final
igual ve "LOCA" en la pantalla de consentimiento).
El acceso a publicación en páginas se pide vía el producto **Community Management
API** (formulario de use case enviado el 2026-08-11; aprobación tarda días/semanas).

⚠️ **La app usa SOLO el producto Community Management API.** Es INCOMPATIBLE con
"Sign In with LinkedIn using OpenID Connect" en la misma app (limitación de
LinkedIn); además CMA deshabilita los scopes `openid`/`profile` y `/v2/userinfo`.
La identidad del usuario se obtiene con el scope `r_basicprofile` (incluido en
CMA) + `GET https://api.linkedin.com/v2/me`.

### Lado Sebastián (dashboard LinkedIn)
- [ ] Crear app + asociar la página de **INFINIDAD** + **Verify** (Settings →
      Verify, la aprueba el admin de la página de INFINIDAD).
- [ ] En el formulario de use case, presentar a LOCA como producto de INFINIDAD
      ("LOCA (heyloca.ai) is a product of INFINIDAD").
- [x] Products: "Community Management API" solicitada (2026-08-11). NO agregar
      "Sign In with LinkedIn" — incompatible con CMA (ver ⚠️ arriba).
- [x] Auth: redirect URL registrada como
      `https://app.heyloca.ai/api/integrations/linkedin/callback` (verificado
      2026-11-18: LinkedIn acepta esa URL y rechaza la del apex).
      Client ID: `86y4sv6gesow5e`.
- [x] Alan agregado como team member de la app de LinkedIn.
- [x] Env vars de LinkedIn cargadas en Vercel (`/status` las reporta como
      configuradas).
- [x] Community Management API aprobada: LinkedIn acepta los scopes
      `r_basicprofile rw_organization_admin w_organization_social` en el
      diálogo de autorización (verificado 2026-11-18).

### Por qué "no funcionaba" (diagnóstico 2026-11-18)
El OAuth arrancaba bien pero el callback fallaba después de obtener el token:
1. **Versión de API vencida.** El código mandaba `LinkedIn-Version: 202506`;
   LinkedIn mantiene cada versión ~1 año y 202506 venció en junio 2026. Todo
   `/rest/*` (listar páginas, subir imagen, crear post) devolvía HTTP 426
   `NONEXISTENT_VERSION`. Fix: default `202611` + env `LINKEDIN_VERSION`
   para subirla sin deploy. **Hay que subirla al menos una vez por año.**
2. **Campo equivocado al leer las páginas.** Se leía `organizationalTarget`
   (API vieja); `/rest/organizationAcls` devuelve `organization` (o
   `organizationTarget`). Aun con versión válida, la lista de páginas daba
   vacía → "no encontramos una página de empresa".
3. **El error se descartaba.** La card borraba el `reason` del redirect y
   mostraba "No pudimos conectar. Probá de nuevo", así que no había forma de
   ver la causa. Ahora la card muestra el motivo (traducido cuando es uno
   conocido: scope no autorizado, redirect URI, versión de API, token vencido).

Además: si el usuario administra varias páginas ahora puede elegir cuál
(`GET /api/integrations/linkedin/organizations` + `PATCH …/connection`), el
`/v2/me` dejó de ser bloqueante (si falla se usa el person URN del ACL), y el
retry puntual del publish acepta `platform: "linkedin"`.

⚠️ La app está en tier **Development** de CMA: 500 llamadas/día por app y 100
por usuario, sin BATCH_GET. Por eso el listado de páginas es a demanda (botón
"Cambiar página"), no en cada carga de Settings. Para producción real pedir
el tier Standard.

### Lado dev — módulo `src/lib/linkedin/` + rutas
- OAuth 2.0 (3-legged):
  - Authorize: `https://www.linkedin.com/oauth/v2/authorization` con
    `response_type=code` y `scope=r_basicprofile rw_organization_admin w_organization_social`
    (los de lectura/métricas se suman cuando se hagan las métricas de LinkedIn).
  - Token: `POST https://www.linkedin.com/oauth/v2/accessToken`
    (access token ~60 días + `refresh_token` ~365 días para apps aprobadas;
    refresh con `grant_type=refresh_token` — extender el cron de refresh).
- Identidad del usuario: `GET https://api.linkedin.com/v2/me` (scope `r_basicprofile`).
  NO usar `/v2/userinfo` ni scopes `openid`/`profile` — no funcionan en apps con CMA.
- Listar páginas que administra el usuario:
  `GET https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR`
  → el usuario elige la página (guardar el `urn:li:organization:{id}`).
- Publicar post con imagen (API versionada: headers `LinkedIn-Version: {LINKEDIN_VERSION}`
  y `X-Restli-Protocol-Version: 2.0.0`):
  1. `POST /rest/images?action=initializeUpload` (owner = URN de la org)
  2. PUT del binario a la `uploadUrl` devuelta
  3. `POST /rest/posts` con `author: "urn:li:organization:{id}"`, `commentary`,
     `content.media.id` = URN de la imagen, `visibility: "PUBLIC"`,
     `lifecycleState: "PUBLISHED"`.
- Métricas: `GET /rest/organizationalEntityShareStatistics` (por post/página).
- Rutas API: `/api/integrations/linkedin/{connect,callback}` (mismo patrón
  state firmado anti-CSRF que Meta). No hay webhook ni deauthorize callback.
- Conexión con `provider: "linkedin"` en el repositorio de conexiones.
- Botón "Conectar LinkedIn" en Settings; publish/insights eligen cliente por provider.

### Env vars LinkedIn (Vercel)
| Variable | Valor |
|---|---|
| `LINKEDIN_CLIENT_ID` | `86y4sv6gesow5e` |
| `LINKEDIN_CLIENT_SECRET` | ⚠️ Alan: pedírselo a Sebastián (o sacarlo de la Auth tab, ya está como team member) y cargarlo directo en Vercel |
| `LINKEDIN_OAUTH_REDIRECT_URI` | `https://app.heyloca.ai/api/integrations/linkedin/callback` |
| `LINKEDIN_VERSION` | opcional; default `202611`. Subirla cuando LinkedIn devuelva HTTP 426 |

⚠️ El dev solo puede probar publicación cuando LinkedIn apruebe la Community
Management API (los scopes `*_organization_*` no aparecen antes). El flujo de
login/OpenID se puede dejar armado desde el día 1.

## 6. Referencia — URL de inserción generada por el dashboard (IG Login)

```
https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=1011168477969085&redirect_uri=https://app.heyloca.ai/api/integrations/instagram/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights
```

(Recordar: en código usar solo los 3 scopes aprobables — ver §2. Y el `redirect_uri`
de arriba ya está corregido al subdominio de la plataforma; el que genera el
dashboard va a traer el que esté configurado ahí.)
