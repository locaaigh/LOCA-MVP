# LOCA — Info para poner en producción (handoff dev)

Todo lo que el dev necesita para deployar LOCA y dejar la publicación en redes lista.
Fuente de verdad de backlog/pendientes: `PLAN-v2.md`. Handoff diario: `RESUMEN-*.md`.

## 1. Stack y hosting
- **Next.js 14 (App Router) + TypeScript + Tailwind**. Deploy target: **Vercel** (route handlers en runtime `nodejs`).
- **Supabase**: auth + Postgres + Storage (imágenes).
- Comandos: `npm install` · `npm run build` · `npm run start` · `npm run typecheck`.
- Node 20+ (probado con 22).

## 2. Variables de entorno (Vercel → Project Settings → Environment Variables)

### Dominios (split web / plataforma — ver §6)
| Var | Nota |
|-----|------|
| `NEXT_PUBLIC_APP_ORIGIN` | `https://app.heyloca.ai`. **Es el interruptor del split**: vacía, todo convive en un dominio; seteada, el middleware rutea por host y los CTAs de la web apuntan al subdominio. Scope **Production solamente** (ver §6). |
| `NEXT_PUBLIC_MARKETING_ORIGIN` | `https://heyloca.ai`. Usada por `robots.ts`, `sitemap.ts` y el `metadataBase` del layout. Si se deja vacía el default es ese mismo valor. |

⚠️ Ambas son `NEXT_PUBLIC_*`: se **inlinean en build time**. Cambiarlas exige **redeploy**, no alcanza con reiniciar.

### IA (texto e imágenes)
| Var | Valor / nota |
|-----|--------------|
| `AI_TEXT_PROVIDER` | `anthropic` (o `openai`) |
| `AI_IMAGE_PROVIDER` | `gemini` (o `openai`) |
| `ANTHROPIC_API_KEY` | key real |
| `ANTHROPIC_MODEL` | ⚠️ **VERIFICAR ID VÁLIDO** (hoy `claude-sonnet-4-6` es sospechoso; usar un modelo real vigente, p.ej. `claude-sonnet-4-5` o Claude 5). Si el ID es inválido, la app cae a MOCK en silencio. |
| `GEMINI_API_KEY` | key real |
| `GEMINI_IMAGE_MODEL` | ⚠️ **VERIFICAR ID VÁLIDO** (hoy `gemini-3-pro-image`). Confirmar el ID de imagen vigente. |
| `OPENAI_API_KEY` | opcional (fallback de imágenes/texto) |
| `OPENAI_TEXT_MODEL` | `gpt-4o-mini` (si se usa OpenAI) |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` (si se usa OpenAI) |

### Supabase
| Var | Nota |
|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreta, solo server** |

### Meta (Instagram/Facebook)
| Var | Nota |
|-----|------|
| `META_APP_ID` | `1413889790567718` (app "LOCA", dueña INFINIDAD, negocio verificado) |

Activos de LOCA en el Business Manager de INFINIDAD (creados 2026-08-09):
- Página de Facebook: `1323141937538765` · Instagram: `17841415532490078` · Cuenta publicitaria: `1757064552092437`.
- Pixel "LOCA": `1348727130754842` (→ `NEXT_PUBLIC_META_PIXEL_ID`). Pendiente Fase 2: Conversions API server-side con dedup (requiere access token del Events Manager).

Google Ads (cuenta propia de LOCA, verificación con la LLC — creada 2026-08-09):
- Customer ID: `363-630-4933` (vincular al MCC de INFINIDAD para administración).
- Google tag: `AW-18380065250` (→ `NEXT_PUBLIC_GOOGLE_ADS_ID`).
- Conversión "Signup LOCA" (Sign-up, same value USD 89, count One): `send_to` = `AW-18380065250/wZQ6CNfc5d4cEOKTprxE` (→ `NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL`).
| `META_APP_SECRET` | secreta |
| `META_OAUTH_REDIRECT_URI` | **debe apuntar al subdominio de la plataforma**: `https://app.heyloca.ai/api/integrations/meta/callback`. Si se deja vacío se deriva del origin del request (funciona, pero queda dependiendo de por qué host entró el usuario). Tiene que coincidir **exacto** con lo registrado en Meta Console. |
| `META_TOKEN_ENCRYPTION_KEY` | 32 bytes base64 (`openssl rand -base64 32`). Cifra los tokens. **No rotar sin migrar** o se pierden las conexiones. |
| `META_SCOPES` | opcional, para pisar scopes |
| `CRON_SECRET` | protege el cron de refresh de tokens (`openssl rand -hex 32`) |

### Analytics (PostHog)
| Var | Nota |
|-----|------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Project API Key (`phc_...`) — PostHog → Settings → Project. Sin ella PostHog queda deshabilitado (los eventos de negocio igual van a la tabla `events` de Supabase). |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` (proyecto en región US). |
| `NEXT_PUBLIC_META_PIXEL_ID` | Opcional: ID del Meta Pixel (Business Manager INFINIDAD). Sin ella el pixel no se carga. |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | Opcional: Google tag `AW-XXXXXXXXX` (al activar Google Ads). |
| `NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL` | Opcional: `AW-XXXXXXXXX/label` de la conversión de signup en Google Ads. |

Plan completo de medición: `docs/ANALYTICS-PLAN.md`. Migración requerida: `0006_analytics.sql` (tablas `events` y `leads` + columnas nuevas de `ai_usage_log`).

**📋 Checklist analytics para el deploy (Alan):**
- [ ] Cargar en Vercel: `NEXT_PUBLIC_POSTHOG_KEY` = `phc_mSqXHtzzroNJoQeyv2LVRCFtqnX8XPZTAzfAnnaULPza` y `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com` (Production; Preview opcional).
- [ ] Correr la migración `supabase/migrations/0006_analytics.sql` en Supabase → SQL Editor (después de la 0005).
- [ ] Verificar post-deploy: navegar la web y ver que entren `$pageview` en PostHog → Activity, y que `https://heyloca.ai/sitemap.xml` y `/robots.txt` respondan.
- [ ] Cargar en Vercel: `NEXT_PUBLIC_META_PIXEL_ID` = `1348727130754842` (pixel "LOCA").
- [ ] Cargar en Vercel: `NEXT_PUBLIC_GOOGLE_ADS_ID` = `AW-18380065250` y `NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL` = `AW-18380065250/wZQ6CNfc5d4cEOKTprxE`.

### Debug
| Var | Nota |
|-----|------|
| `NEXT_PUBLIC_SHOW_AI_USAGE` | `true` en pruebas (muestra contador de tokens/costo); **poner `false` en prod real**. |

## 3. Supabase — migraciones
- Migraciones en `supabase/migrations/` → `0001_init.sql` … `0006_analytics.sql`.
- Aplicarlas **en orden** en Supabase Dashboard → SQL Editor. Verificar esquema con `scripts/verify-supabase-schema.mts`.
- Storage: bucket de imágenes con **URLs públicas** (necesario para publicar en Instagram, que rechaza data URLs).

## 4. Crons (Vercel)
- `vercel.json` define el cron `/api/cron/meta/refresh-tokens` (6 AM diario). Requiere `CRON_SECRET`.
- ⚠️ **Pendiente para auto-publicación programada**: hoy NO hay cron que publique según fecha. Cuando se implemente, requiere **Vercel Pro** (cron por minuto/hora) o un scheduler externo. Sin eso, la publicación es manual (botón "Publicar ahora" o export pack).

## 5. Meta — checklist antes de usuarios reales
> Los legales viven en el dominio de marketing; el OAuth en el de la plataforma.

- [ ] **Privacy Policy URL** en Meta App → cargar `https://heyloca.ai/legal/privacy`.
- [ ] **Terms of Service URL** → cargar `https://heyloca.ai/legal/terms` (⚠️ hoy apunta a facebook.com).
- [ ] **Data Deletion URL** → `https://heyloca.ai/legal/meta-data-deletion`.

Legales (páginas Next que deployan con la app; también hay HTML autocontenidos en `docs/legal/`):
- Entidad operadora: **INFINIDAD S.R.L.** · CUIT 30-71581900-3 · Condarco 3145, CABA.
- Email de soporte/legales: **soporte@heyloca.ai** · Dominio: **heyloca.ai**.
- ⚠️ Los legales son borradores operativos; que un asesor legal les dé el ok final antes de prod.
- [ ] **Valid OAuth Redirect URIs** → `https://app.heyloca.ai/api/integrations/meta/callback` (exacto, igual a `META_OAUTH_REDIRECT_URI`) + `http://localhost:3000/api/integrations/meta/callback` para dev.
- [ ] **App Domains** → `heyloca.ai` y `app.heyloca.ai`.
- [ ] **App Review**: pedir Advanced Access de `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish` (con screencast del flujo). Sin esto, publicar solo funciona para cuentas con rol en la app.
- [ ] Pasar la app a **Live** una vez aprobado + negocio verificado (✅ INFINIDAD ya verificado).

## 6. Dominios — split web de marketing / plataforma

```
heyloca.ai      → web de marketing   (/, /precios, /funcionalidades, /como-funciona, /contacto, /para/*)
app.heyloca.ai  → plataforma          (/dashboard, /onboarding, /login, /signup, /strategy, /content, …)
/legal/*, /api/*                      → compartidas, se sirven en ambos hosts sin redirect
```

**Un solo codebase y un solo proyecto de Vercel** sirven los dos hosts; el ruteo lo hace
`src/middleware.ts` leyendo el header `Host`. **No** hay que crear un segundo proyecto, ni
separar repos, ni configurar CORS (los `fetch("/api/…")` son relativos y resuelven al mismo
deploy en cualquiera de los dos hosts).

El interruptor es `NEXT_PUBLIC_APP_ORIGIN`: sin ella el middleware no redirige nada y todo
convive en un dominio (así funcionan dev y los previews de Vercel).

### 6.1 Vercel + DNS
1. **Un solo proyecto** (el que ya deployea este repo).
2. Settings → Domains → agregar los tres: `heyloca.ai`, `www.heyloca.ai`, `app.heyloca.ai`.
3. Marcar **`heyloca.ai` (apex) como dominio primario**, con `www.heyloca.ai` redirigiendo a él.
   El middleware acepta `www` como host de marketing pero **no canonicaliza a apex** — eso lo
   resuelve Vercel. Sin este paso, `www` y apex quedan como contenido duplicado.
4. Cargar en el registrar los registros DNS que muestre Vercel (apex + CNAME del subdominio).
   Esperar verificación y emisión de SSL de los tres.
5. **Todavía no setear `NEXT_PUBLIC_APP_ORIGIN`.** Verificar primero que los tres hosts sirven
   la app igual que hoy, sin redirects. Ese es el estado seguro previo, y separa "el DNS
   funciona" de "el split funciona".

⚠️ **Scope de las env vars: Production solamente.** En Preview harían que los CTAs de la web
apunten al `app.heyloca.ai` de producción (`appHref()` genera URL absoluta), rompiendo el
testing de los previews. El middleware en sí es seguro ahí (host desconocido → no toca nada).

### 6.2 Supabase Auth
- **Site URL** → `https://app.heyloca.ai`. El signup no pasa `emailRedirectTo`, así que el link
  de confirmación sale de acá.
- **Additional Redirect URLs** → `https://app.heyloca.ai/**` + `http://localhost:3000/**`.
- Red de contención: si un link viejo cae en `heyloca.ai/auth/callback`, el middleware lo manda
  al host de app **preservando el querystring**, así que el `code` sobrevive y el login anda igual.

### 6.3 Meta Developer Console
Ver checklist de §5: legales en `heyloca.ai`, OAuth redirect en `app.heyloca.ai`, App Domains
con los dos.

### 6.4 Activar el split
Setear en Vercel (Production) `NEXT_PUBLIC_APP_ORIGIN=https://app.heyloca.ai` y
`NEXT_PUBLIC_MARKETING_ORIGIN=https://heyloca.ai`, y **redeployar**.

### 6.5 Verificar después de activar
| Caso | Esperado |
|---|---|
| `app.heyloca.ai/` | 307 → `app.heyloca.ai/dashboard` |
| `app.heyloca.ai/precios` | 307 → `heyloca.ai/precios` |
| `heyloca.ai/dashboard` | 307 → `app.heyloca.ai/dashboard` |
| `heyloca.ai/login?next=/x` | 307 → `app.heyloca.ai/login?next=/x` (querystring preservado) |
| `/legal/privacy` en ambos hosts | 200 en los dos, sin redirect |
| `heyloca.ai/contacto` → enviar form | 200 y lead en Supabase (`POST /api/contact`) |
| `app.heyloca.ai` (cualquier ruta) | header `X-Robots-Tag: noindex` |
| `heyloca.ai/robots.txt` y `/sitemap.xml` | URLs absolutas a `heyloca.ai` (no `www`, no `app`) |

Flujos end-to-end en `app.heyloca.ai`: signup → mail de confirmación → `/auth/callback` → sesión
→ `/dashboard`; y conectar Meta desde `/settings` (si el `redirect_uri` no coincide exacto con
Meta Console, falla acá).

Atribución: entrar a `heyloca.ai/?utm_source=test&utm_campaign=split`, tocar "Empezar", hacer
signup, y confirmar en PostHog que la persona quedó con `$initial_utm_source=test`.

### 6.6 Rollback
Borrar `NEXT_PUBLIC_APP_ORIGIN` y redeployar. El middleware vuelve a no redirigir y los tres
dominios sirven la app completa, como antes. Un solo switch, sin migración de datos.

## 7. Verificado al 2026-08-02
- ✅ Credenciales Meta (`META_APP_ID`+`META_APP_SECRET`) válidas contra Graph API. App = "LOCA".
- ⚠️ Privacy Policy URL sin cargar · Terms apunta a facebook.com.
- 🔴 Verificar model IDs de IA (ver sección 2) — posible mock silencioso.
