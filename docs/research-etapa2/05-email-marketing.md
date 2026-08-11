# Investigación FASE 2: Email marketing automático para LOCA

> Research profundo, ago 2026. Resumen accionable en `PLAN-etapa2.md` §5.

## 1. APIs de plataformas existentes — ¿campaña 100% por API?

### Mailchimp (Marketing API) — SÍ, ciclo completo por API ✅
- **Flujo completo sin que el cliente entre a la herramienta**: `POST /campaigns` → `PUT /campaigns/{id}/content` (HTML o template) → `POST /campaigns/{id}/actions/schedule` o `/actions/send` → `GET /reports`. Docs: [Campaigns](https://mailchimp.com/developer/marketing/api/campaigns/), [Set content](https://mailchimp.com/developer/marketing/api/campaign-content/set-campaign-content/), [Send](https://mailchimp.com/developer/marketing/api/campaigns/send-campaign/).
- **OAuth 2 oficial** para conectar cuentas de terceros ([convenciones](https://mailchimp.com/developer/marketing/guides/marketing-api-conventions/)). Audiencias y segmentos por API.
- **Automatizaciones: el punto débil.** Las "Classic Automations" por API son legacy y limitadas; los Customer Journeys nuevos ([Automation flows API](https://mailchimp.com/developer/marketing/api/customer-journeys-journeys-steps-actions/)) solo permiten disparar pasos, no construir el journey.
- **Plan free 2026 casi inútil**: **250 contactos / 500 emails por mes**, sin scheduling, con branding ([detalle](https://costbench.com/software/marketing-automation/mailchimp/free-plan/)). El cliente necesitaría Essentials (USD 13+/mes) — costo que compite contra el precio de LOCA.

### Doppler (Argentina) — SÍ crea/envía campañas por API, con fricción de auth ⚠️
- La [API REST de Doppler](https://restapi.fromdoppler.com/docs/) permite **"construir, editar, enviar y eliminar campañas"**, listas, campos custom, suscriptores y reportes.
- **Autenticación por API key** (no OAuth): el cliente copia/pega su key — más fricción, viable.
- **Muy fuerte para agencias**: [Client Manager](https://www.fromdoppler.com/en/email-marketing-for-agencies/) permite crear/administrar/monitorear cuentas de múltiples clientes — lo más parecido a "modelo agencia" en LATAM. Cobra en **ARS con débito automático**.
- [Precios](https://www.fromdoppler.com/en/pricing/): free 500 contactos por 90 días; por contactos desde **USD 10/mes**; por créditos desde USD 15 único.

### Perfit / "Marketing Nube" (Argentina, Tiendanube) — NO permite crear campañas por API ❌
- Perfit fue adquirida/rebrandeada como **Marketing Nube, la solución oficial de Tiendanube** ([app store](https://www.tiendanube.com/tienda-aplicaciones-nube/perfit)).
- Su [API pública](https://developers.myperfit.com/) cubre: **Contacts API**, **Custom Triggers** (disparar automations existentes) y webhooks. La **Transactional API se discontinúa el 1/3/2026**. **No hay endpoints para crear/enviar campañas** — el contenido se arma en su UI.
- Sus automations de Tiendanube (carrito abandonado, bienvenida, win-back, post-compra) son [nativas y preconfiguradas](https://docs.myperfit.com/es/articles/1827589-integracion-con-tiendanube). **Descartable como backend programático; relevante como competidor instalado en Tiendanube.**

### Brevo (ex-Sendinblue) — SÍ, ciclo completo + el mejor modelo multi-cuenta 💡
- API completa: [`POST /v3/emailCampaigns`](https://developers.brevo.com/reference/create-email-campaign) (htmlContent/templateId; listas/segmentos; scheduledAt) + [`/sendNow`](https://developers.brevo.com/reference/send-email-campaign-now), reportes, contactos, automations, webhooks.
- **Sub-accounts para agencias**: cada sub-cuenta con **su API key, IP y dashboard**, administración y facturación centralizadas, **white-label** ([Sub-Account Management](https://www.brevo.com/features/sub-account-management/), [help](https://help.brevo.com/hc/en-us/articles/9003097317138)). **Problema: solo Enterprise**, ~USD 449+/mes ([análisis](https://smtpedia.com/brevo-pricing/)) — prohibitivo pre-tracción, interesante con 50+ clientes de email.
- SendGrid: subusers + Single Sends API en plan Pro ~USD 89.95/mes, marketing suite débil ([pricing](https://www.sendx.io/blog/sendgrid-pricing)).
- Klaviyo: su nueva [Campaigns API](https://developers.klaviyo.com/en/reference/campaigns_api_overview) ya permite crear y enviar (GA planificada oct-2026), pero caro para pymes AR.

**Resumen**: Mailchimp, Doppler y Brevo permiten el ciclo completo por API. Perfit no. El único "modelo agencia" accesible en precio es **Doppler Client Manager**; el más completo técnicamente es **Brevo sub-accounts (Enterprise)**.

## 2. Infraestructura propia de envío

### Costos base
| Proveedor | Costo | Nota |
|---|---|---|
| **Amazon SES** | **USD 0,10 / 1.000 emails** ([pricing 2026](https://smtpedia.com/amazon-aws-ses-pricing/)) | + VDM USD 0,07/1k opcional; IP dedicada USD 15/mes. El más barato por lejos, hay que construir encima. |
| **Resend** | Free 3k/mes; Pro **USD 20/mes (50k)**; Scale USD 90/mes (100k) ([pricing](https://tiergauge.com/tools/resend/)) | DX excelente, React Email nativo (encaja con Next.js/Vercel). Ojo: Audiences/Broadcasts se cobra **por contactos** (USD 40/mes por 5k) — usar solo la API de envío y listas propias. |
| SendGrid | Pro USD 89.95/mes, subusers + white-label | Maduro multi-tenant, más caro. |
| Postmark | Streams broadcast | Deliverability top, menos multi-tenant. |

### Dominio de envío: la decisión clave de fricción
1. **Subdominio del cliente** (`novedades.clientedominio.com`): mejor marca y deliverability alineada a DMARC, pero el cliente toca DNS (3-4 registros). Práctica recomendada: delegación CNAME al proveedor para SPF/DKIM ([best practices](https://www.suped.com/learn/email-deliverability/how-does-cname-delegation-enable-spf-and-dkim-authentication-for-email-sending), [multi-sender](https://mailflowauthority.com/email-authentication/spf-dkim-dmarc-multiple-senders)). Mitigar con guía por registrador + verificación automática + Eva acompañando.
2. **Subdominio de LOCA** (`cliente.mail.heyloca.ai`, Reply-To del cliente): **cero fricción** — funciona día 1. Contras: marca del remitente no es el dominio del cliente; reputación compartida (un spammer daña a todos). Gmail/Yahoo bulk-sender rules (5k+/día) exigen DMARC de heyloca.ai, one-click unsubscribe (`List-Unsubscribe`) y spam rate <0,3%. Es el modelo Substack/Shopify Email al inicio; aceptable para volúmenes pyme.

**Lo razonable: empezar todos en (2) y ofrecer upgrade a (1) como "mejorá tu marca y deliverability".**

### Qué construir (mini-ESP sobre Supabase)
- Tablas: `email_contacts`, `email_lists/segments`, `email_campaigns`, `email_events` (delivered/open/click/bounce/complaint vía webhooks Resend/SES→SNS), **suppression list global** (unsubscribes + hard bounces + complaints por cliente).
- Página de unsubscribe 1-click sin login + header `List-Unsubscribe-Post` (obligatorio Gmail/Yahoo).
- Templates con **React Email** (el diseño sale como componentes → HTML, con contenido de Claude).
- Rate limiting/warm-up progresivo por cliente + monitoreo de complaint rate con corte automático.
- Esfuerzo: 3-5 semanas para un MVP sólido; mismo patrón que Meta (OAuth/publish/insights).

### ¿White-label ESP listos?
Parcialmente: [Bento](https://bentonow.com/) (subaccounts multi-tenant), [Mailgun](https://www.mailgun.com/solutions/white-label-email-service/) (white-label con dominios del cliente), Customer.io (workspaces, caro), Loops (no multi-tenant). Ninguno resuelve la capa "campañas + segmentos + aprobación" — esa capa ES el producto de LOCA. Tercerizar solo el **delivery** (Resend/SES).

## 3. Comparación de modelos

| Criterio | (a) Herramienta del cliente | (b) Infra propia LOCA | (c) Híbrido |
|---|---|---|---|
| Fricción onboarding | Alta si no tiene cuenta; baja si ya usa Mailchimp/Doppler | **Mínima** | Baja |
| Control del "solo aprobar" | Parcial (Mailchimp OK campañas, mal automations; Perfit imposible) | **Total** | Total mayoría |
| Costo por cliente | USD 10-30/mes a un tercero | **Centavos** (SES) a ~USD 0,4/1k (Resend) | Bajo |
| Deliverability | Excelente | Riesgo compartido, gestionable | Media-alta |
| Lock-in | Alto (Perfit mató su Transactional API) | Bajo | Medio |
| Métricas para Eva | Vía API | Nativas en tiempo real | Ambas |

**Comparables**: Mailchimp/Klaviyo/Omnisend agregan IA *dentro* de su propia infraestructura ([panorama 2026](https://adlibrary.com/posts/ai-email-marketing-tools-compared)). Klaviyo vende "Marketing Agent" ([Klaviyo](https://www.klaviyo.com/compare/klaviyo-vs-mailchimp)) — valida la tesis de LOCA y que **el que controla el envío controla el producto**.

## 4. Contactos y marco legal

**Fuentes de contactos** (por valor):
1. **Ecommerce vía API/webhooks**: Tiendanube expone Customers, Orders y **Abandoned Checkouts** con OAuth + webhooks HMAC ([docs](https://tiendanube.github.io/api-documentation/resources/webhook)) — trigger de carrito abandonado + historial de compra para segmentar.
2. **CSV import** con validación y deduplicación (declaración de consentimiento; rechazar listas compradas en T&C).
3. **Formulario/pop-up que LOCA genera** para la web del cliente (script embebible) — lista con consentimiento limpio.

**Legal Argentina (Ley 25.326)**:
- Regla: consentimiento libre, expreso e informado. El **art. 27** habilita marketing directo con datos de fuentes públicas o **aportados por el titular** (ej. cliente que compró), con **derecho de bloqueo** informado en cada comunicación ([ley](https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm), [análisis](https://abogados.com.ar/tratamiento-de-datos-personales-con-fines-publicitarios/23466)).
- **Unsubscribe obligatorio, simple y gratuito** (también exigido técnicamente por Gmail/Yahoo).
- El **Registro No Llame aplica a llamadas, no a email** ([AAIP](https://nollame.aaip.gob.ar/faqs.html)); para email rige la Disposición 4/2009 (asunto identificable como publicidad + mecanismo de baja).
- **Doble opt-in: NO obligatorio en Argentina** — best practice en forms nuevos, innecesario para clientes existentes del ecommerce.
- LATAM: México (LFPDPPP) y Brasil (LGPD) más estrictos; CAN-SPAM si envían a EE.UU. Diseñar "GDPR-ish" (registro de consentimiento con timestamp + fuente) cubre todo.

## 5. Automatizaciones de valor para pymes

| Automatización | Infra propia | Mailchimp API | Doppler API | Perfit |
|---|---|---|---|---|
| Bienvenida | ✅ trivial | ⚠️ classic legacy | ⚠️ vía UI | ✅ nativa (no autoral) |
| Carrito abandonado | ✅ webhook Tiendanube → timer → send | ⚠️ | ⚠️ | ✅ nativa (contenido no controlable) |
| Win-back | ✅ query Supabase sobre orders | ⚠️ | ⚠️ | ✅ nativa |
| Newsletter mensual | ✅ | ✅ | ✅ | ❌ |
| Promos fechas especiales | ✅ **reutiliza el calendario por industria existente** | ✅ | ✅ | ❌ |

**Las automatizaciones diferenciales (fechas especiales + contenido de Eva) solo funcionan con campañas por API o infra propia**; los triggers de ecommerce son fáciles con infra propia (Tiendanube ya da los webhooks).

## 6. Recomendación final

**Modelo: híbrido con infra propia como camino principal (b→c).**

**Por qué infra propia primero**: (i) el pitch "el cliente no gestiona nada" se rompe si debe crear/pagar Mailchimp; (ii) costo marginal ridículo (3.000 contactos × 4 campañas/mes = 12k emails ≈ **USD 1,20-5/mes** vs add-on de USD 29-39 → margen >90%); (iii) métricas en tiempo real para Eva; (iv) mismo patrón arquitectónico que Meta.

**Arquitectura**:
- **Envío**: Resend para MVP (Pro USD 20/mes ≈ 50k emails), abstracción de provider → **SES cuando el volumen supere ~100-200k/mes**. Listas/segmentos/supresión en Supabase.
- **Dominios**: lanzar con `cliente.mail.heyloca.ai` + upgrade guiado a subdominio del cliente.
- **Contactos**: Tiendanube (OAuth + webhooks: customers, orders, abandoned checkouts) prioritaria; CSV + formulario embebible como complemento.
- **Generación**: nuevos agentes en `src/lib/ai/agents/` (estrategia de email, copy, segmentación) + React Email con el brand kit; aprobación idéntica al contenido social.

**Fases**:
1. **F1 (4-6 semanas)**: mini-ESP (contactos, supresión, unsubscribe, webhooks) + newsletter mensual + fechas especiales, Resend, subdominio LOCA, métricas en dashboard.
2. **F2**: Tiendanube (sync contactos + carrito abandonado + win-back), doble opt-in en forms, subdominio del cliente.
3. **F3**: conectores OAuth — **Mailchimp primero** (OAuth maduro, campañas completas), **Doppler segundo** (mercado AR); Perfit solo sync de contactos/triggers si hay demanda. Brevo Enterprise con 50+ clientes.

**Pricing del add-on**: USD 29-39/mes hasta ~5.000 contactos — por debajo del combo "Mailchimp Standard + tiempo propio"; costo de infra <5% del precio.

**Riesgos**: reputación compartida del dominio LOCA (validación de listas al importar, corte por complaint rate >0,1%, warm-up); reglas bulk-sender Gmail/Yahoo (one-click unsubscribe desde día 1); Perfit/Marketing Nube como competidor default en Tiendanube (diferenciarse por contenido + estrategia); cumplimiento 25.326 (registro de consentimiento + leyenda de baja).

Fuentes: [Mailchimp Campaigns API](https://mailchimp.com/developer/marketing/api/campaigns/) · [Doppler API](https://restapi.fromdoppler.com/docs/) · [Doppler agencias](https://www.fromdoppler.com/en/email-marketing-for-agencies/) · [Perfit Developers](https://developers.myperfit.com/) · [Brevo create campaign](https://developers.brevo.com/reference/create-email-campaign) · [Brevo sub-accounts](https://www.brevo.com/features/sub-account-management/) · [SES pricing](https://smtpedia.com/amazon-aws-ses-pricing/) · [Resend pricing](https://tiergauge.com/tools/resend/) · [Tiendanube webhooks](https://tiendanube.github.io/api-documentation/resources/webhook) · [Ley 25.326](https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm) · [AAIP No Llame](https://nollame.aaip.gob.ar/faqs.html) · [Klaviyo Campaigns API](https://developers.klaviyo.com/en/reference/campaigns_api_overview) · [Subdomain delegation](https://www.suped.com/learn/email-deliverability/how-does-cname-delegation-enable-spf-and-dkim-authentication-for-email-sending)
