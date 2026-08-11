# PLAN Etapa 2 — LOCA (ago 2026)

Fuente: research profundo (5 investigaciones con fuentes, ago 2026) + pendientes de PLAN-v2/RESUMEN-2026-08-02.
Los 6 frentes: Meta Ads · Google Ads · Webs automáticas · Ecommerce · Email marketing · Resto del backlog.

**Tesis general del research: todo lo pedido es factible.** Ninguno de los 5 frentes tiene un bloqueo técnico duro. Los bloqueos reales son (a) trámites lentos de plataformas (reviews, tokens, líneas de crédito) que hay que **iniciar YA**, y (b) el modelo financiero de revender pauta, que conviene hacer **en dos fases** (primero tarjeta del cliente, después prepago vía LLC) en ambas plataformas de ads.

---

## 0. Sinergias entre frentes (por qué el orden importa)

- **Ecommerce alimenta a todos**: catálogo → contenido orgánico, ads dinámicos (feeds Meta/Google), email (contactos + carrito abandonado), webs (catálogo en la página). Es la integración con mayor efecto multiplicador → va primero.
- **Webs generan los datos de conversión** que ads necesita (leads, clicks WhatsApp medidos con PostHog) y el formulario que alimenta las listas de email.
- **Meta Ads y Google Ads comparten** el mismo modelo de negocio (fee por volumen de pauta, prepago vía LLC en fase 2) y el mismo motor: Eva propone → cliente valida presupuesto → LOCA ejecuta y optimiza → reporte semanal en lenguaje humano.
- **La ventaja estructural de LOCA en ads**: como Eva genera TODAS las creatividades, podemos garantizar compliance de policies antes de publicar (ninguna agencia con clientes que suben sus propios ads puede) y hacer refresh creativo a costo marginal ~0 — que es donde está el valor real de optimización en la era Advantage+/PMax.

---

## 1. META ADS — gestión 100% automática

**Veredicto: SÍ es posible, cobertura completa por Marketing API** (campañas, ad sets, ads, creatividades, públicos, presupuestos, insights, automated rules). Construir sobre la estructura **Advantage+ nueva** (v24+), nunca sobre ASC legacy (deprecada, muere en v25.0 Q1 2026).

### Modelo de cuentas — respuesta a la pregunta central
- **¿Crear cuentas publicitarias por API?** Existe pero está gateado: solo para partners con **línea de crédito (LOC) propia del BM** y coordinación con sales rep de Meta. NO disponible para LOCA hoy → Fase C.
- **Camino real (Fase B):** crear las ad accounts **manualmente en un BM propio** y gestionarlas 100% por API. Un BM nuevo arranca con 1–5 cuentas; el límite crece con historial de gasto/pago. Alcanza para el piloto; a escala se escalonan BMs o se llega a LOC.
- **Modelo "agency ad account" = estándar recomendado por Meta**: LOCA es dueña del ad account; el cliente es dueño de su Página (+pixel) y da partner access (ya resuelto por la integración orgánica). LOCA gestiona pauta como servicio = permitido. Lo prohibido es *vender acceso a cuentas* (gray market) — no es nuestro caso.

### Riesgos del BM propio (reales, mitigables)
- **Efecto cascada**: un BM restringido congela TODO su portfolio (y las Páginas atrapadas no pueden volver a pautar). Mitigación obligatoria:
  1. **BM de medios separado** ("LOCA Media", verificado) — NUNCA meter ad accounts de clientes en el BM que aloja la app de Meta/integración orgánica (INFINIDAD).
  2. **Un ad account por cliente** (aísla violaciones y facturación).
  3. **Moderación automática de creatividades pre-publicación** (categorías prohibidas/restringidas: salud, cripto, empleo, vivienda, política).
  4. No aceptar verticales de alto riesgo en el plan de ads al inicio.
  5. Higiene: 2FA, system users, dominios verificados.
- **Responsabilidad de gasto**: con normal liability LOCA paga a Meta aunque el cliente no pague → prepago estricto (abajo).

### Cobro anticipado — respuesta: SÍ, es el modelo clásico de media buying
- Cobrar pauta por adelantado (con fee/markup divulgado en T&C) y pagar a Meta después = *principal media buying*, permitido y común (precedentes a escala SMB: Hibu/Tiger Pistol, Vendasta AdPilot).
- **Argentina 2026**: impuesto PAÍS eliminado (dic-2024); pagar Meta (Ireland) con tarjeta AR = IVA 21% + percepción 30% (~+51%, la percepción se recupera pero inmoviliza caja ~1 año). Existen cuentas prepagas en ARS (Mercado Pago/Rapipago).
- **Modelo más limpio: la vía LLC** (ya usada para suscripciones): BM de medios a nombre de la LLC de EE.UU., Meta factura a la LLC sin impuestos AR, LOCA cobra al cliente pauta + fee **en USD vía Stripe, prepago tipo wallet**, con **spending limit nativo de Meta = saldo del cliente** (imposible pasarse). Elimina descalce cambiario y el ciclo de percepciones del cliente. ⚠️ Validar con contador el tratamiento impositivo del cliente AR que paga a la LLC — no prometer "sin impuestos" antes de eso.
- Riesgo restante: chargebacks de Stripe → T&C explícitos, reportes como evidencia de servicio, no acumular saldos grandes de clientes nuevos.

### Loop de optimización
Insights API diario → **kill rules con piso de gasto** (no matar ads antes de ~$20–30 o de salir del learning) → **refresh creativo** cuando sube frequency y cae CTR (ventaja LOCA) → reasignación semanal de presupuesto decidida por Eva → **reporte semanal en lenguaje humano al cliente**. Automated Rules de Meta existen vía API, pero un motor propio (cron + Eva en el loop) da más control.

### Fases
- **A (piloto, 1–2 meses dev):** cliente conecta SU cuenta vía OAuth `ads_management` (App Review con screencast — proceso ya conocido). Cliente paga a Meta directo; LOCA cobra solo fee. Cero riesgo financiero. Wizard guiado para quien no tiene cuenta (acá se van a caer clientes — es la fricción que la Fase B elimina).
- **B (el diferencial):** BM de medios separado + ad accounts propias (manuales) + partner access a la Página + prepago USD vía LLC/Stripe + spending limit. El cliente no toca NADA.
- **C (escala):** Meta Business Partners (canal de soporte humano ante restricciones — el beneficio real) + LOC/monthly invoicing (~USD 50k/mes de spend agregado, community-reported) → creación programática de cuentas.

### Números
- Pauta mínima viable: **USD 300/mes** (tráfico/leads local); USD 500+ para conversiones reales; USD 150–200 solo awareness.
- Acceso API: development tier alcanza para arrancar; Full/Standard se pide tras ≥500 llamadas en 15 días con <15% error.
- Pricing sugerido (benchmark agencias: 10–20% del spend o retainer $1.000–2.500 — reventable por abajo):
  - **Ads Starter** +USD 49/mes (pauta hasta 500) · **Ads Growth** +USD 99/mes (hasta 1.500) · **Ads Scale** 10% del spend (mín. 149). En Fase B, margen financiero adicional 5–10% divulgado.

---

## 2. GOOGLE ADS

**Veredicto: SÍ, la API cubre todo** (Search, PMax, Demand Gen, presupuestos, pujas, RSA, asset groups, reporting GAQL). **Smart Campaigns MUERTAS para creación vía API desde el 3/8/2026** → construir sobre **Search (base para todos) + PMax (upgrade para presupuestos mayores)**.

### Estructura de cuentas — 3 capas (crítico)
1. **MCC "API"**: contiene el developer token, sin pauta, sin riesgo (si un MCC operativo cae, la API de todos los clientes NO cae).
2. **MCC operativo LOCA**: administra las cuentas cliente.
3. **Cuentas cliente**: siempre con acceso admin del cliente + customer ID visible en la app (obligación de transparencia + anti-lock-in).

- **Crear cuentas por API** (`CreateCustomerClient`): posible, pero solo para MCCs con >USD 1.000 de gasto histórico y buen standing (endurecido mar-2025, con cuotas). Un MCC nuevo NO puede el día 1 → al inicio creación manual asistida; vincular cuenta existente (`CustomerClientLink` + OAuth) cuando el cliente ya tiene.
- **Developer token**: Explorer (automático, para prototipar) no sirve para producción; **Basic (15.000 ops/día) es el objetivo del MVP** — hay backlog de aprobaciones reconocido por Google → **solicitar YA** con caso de uso detallado. RMF solo aplica a Standard (más adelante).

### Billing — dos fases (la API NO permite cargar tarjeta)
- **Fase 2a (MVP):** tarjeta del cliente en su propia cuenta (único paso manual, guiado por Eva). LOCA cobra solo fee. Cliente RI recibe Factura A de **Google Argentina SRL** con IVA 21% discriminado y computable (¡Google factura local en AR, a diferencia de Meta! + percepciones IIBB desde abr-2025).
- **Fase 2b (6–12 meses):** **monthly invoicing** (requiere empresa ≥1 año, cuenta ≥6 meses, ~USD 5.000/mes en 3 de últimos 12 meses) → perfil de pagos LOCA en todas las cuentas, cobro anticipado por Stripe, pago a Google a 30 días (flujo de caja positivo), billing 100% automatizable por API. ⚠️ No confirmado si el invoicing está disponible contratando con Google Argentina SRL — validar con rep de Google.
- **Transparencia de terceros (obligatorio)**: reportar costo exacto de Google separado del fee; fee por escrito antes de la primera compra; si ≥80% de clientes gastan <USD 1.000/mes → link prominente a la guía "Working with third parties" de Google en la web; entregar customer ID a quien lo pida.

### Riesgos
- Cascada por suspensión de MCC → mitigada por la estructura de 3 capas.
- "Circumventing systems" en cuentas nuevas masivas → crecimiento gradual, nunca recrear una cuenta suspendida.
- **Advertiser identity verification**: el cliente puede tener que verificarse; hay `IdentityVerificationService` en la API para disparar/monitorear la verificación desde el onboarding de Eva (si vence el plazo, la cuenta se pausa).
- Eva genera anuncios/landings → **validador de políticas pre-publicación** (compartido con Meta).

### Optimización y números
- Cron diario: reporting GAQL → reglas propias (pacing, pausado de bajo rendimiento, keywords negativas) + `RecommendationService` con patrón Detect-and-Apply **selectivo** (no auto-aplicar todo: Google recomienda subir gasto).
- Pauta mínima: **USD 200–300/mes Search local** (CPCs AR bajos en USD); **PMax no ofrecerla debajo de ~USD 300–450/mes** (learning).
- Google Partner (badge + soporte): optimization score ≥70% + USD 10k pauta/90 días — alcanzable en piloto.
- Pricing: mismos escalones que Meta Ads (fee separado del costo Google SIEMPRE, en factura).

---

## 3. WEBS AUTOMÁTICAS (add-on)

**Veredicto: SÍ, y el posicionamiento es contra agencias humanas** (AR: landing USD 250–400, institucional USD 600–1.200; MX: USD 1.200–3.500), no contra builders DIY (Durable/Mixo/Wix cobran suscripción y el cliente pyme no los sabe usar). Comparable directo: B12 (IA + humanos, $42–339/mes) — LOCA lo hace con Eva.

### Arquitectura: multi-tenant + "site spec"
- **Un solo runtime Next.js multi-tenant en Vercel** (mismo stack; Platforms Starter Kit; dominios ilimitados sin costo por dominio en Pro) que sirve N sitios por hostname desde un **site spec en Supabase**: design tokens + orden/variante de secciones + copy + imágenes. Feedback = mutar el spec (sin rebuilds). Migrable a estático/Cloudflare después sin tocar el generador.
- **Anti-"todas iguales"** (el modelo Relume automatizado):
  1. **Style guide primero**: agente "Design Director" deriva del brand kit un theme token set persistido — el LLM nunca inventa un hex.
  2. **Biblioteca propia de ~45 variantes de sección** estructuralmente distintas (6 heros, 5 servicios, 4 testimonios, 3 CTA/WhatsApp…) + reglas de composición; hash de combinación para evitar colisiones entre clientes de la misma industria/zona.
  3. **5–7 direcciones estéticas curadas** (cálido-artesanal, clínico-confiable, premium-oscuro…) elegidas por industria+tono; aleatorizar DENTRO de la dirección. 15–20 pares tipográficos pre-aprobados; **prohibido Inter + gradiente violeta**.
  4. **Imágenes propias** (pipeline Gemini + fotos reales del onboarding) = el diferenciador más barato vs. stock.
  5. Presets de jerarquía por industria (gastronomía → menú/reservas arriba; profesional → credibilidad/formulario; comercio → catálogo/WhatsApp) — es también lo que hace que convierta.
- **Features de conversión (MVP)**: CTA WhatsApp `wa.me` con mensaje precargado contextual (65%+ de los negocios AR venden por WhatsApp), formulario → email + lead en Supabase (visible en dashboard LOCA), Maps + click-to-call, catálogo simple (sin carrito), link MercadoPago, SEO técnico (meta/OG/schema LocalBusiness/sitemap), PostHog con eventos (click WhatsApp, form, MP) → "tu web generó 14 consultas este mes" = retención del fee. Multi-idioma NO en MVP.

### Dominios
- Default: subdominio gratis (`cliente.heyloca.site`).
- **.com: compra 100% automática vía Vercel Registrar API** (search/purchase/attach, sin markup) o Porkbun (~$11/año).
- **.com.ar: NIC.ar NO tiene API** y exige CUIT + Clave Fiscal nivel 3 del titular (AR$8.500/año) → **flujo asistido**: Eva da el instructivo, el cliente registra, LOCA solo pide la delegación DNS. Dominios SIEMPRE a nombre del cliente (T&C).

### Flujo de 3 rondas (estándar de industria: 2–3 rondas consolidadas)
1. **Estructura y contenido** (secciones, servicios, orden — cambios estructurales solo acá).
2. **Diseño y estilo** (Eva ofrece 2–3 variantes de dirección estética para ELEGIR — elegir consume menos rondas que describir).
3. **Detalles finales** (micro-ediciones).
- Cada ronda = feedback consolidado en batch (límite ~15 mensajes/ronda); aprobar congela ese nivel. Post-publicación: 2–3 cambios menores/mes por chat incluidos en el fee (retención). **Chat con Eva > editor visual** (no reconstruir Framer).

### Pricing y costos
- **One-shot: USD 199** (sin web) / **USD 299** (renovación). Solo para suscriptores LOCA (refuerza el core). Ronda extra: USD 49.
- **Fee mensual: USD 19/mes** (hosting + SSL + dominio .com + analytics + cambios menores). Costo real < USD 2/sitio/mes → **~90% margen**. IA one-shot: USD 2–8 por única vez.
- Churn del fee: downgrade a subdominio con banner, no borrado (T&C).

### Fases
- **MVP (4–8 semanas):** 3 industrias top del piloto, 45 variantes, tokens desde brand kit, subdominio, WhatsApp+form+Maps+SEO+PostHog, 3 rondas por chat, publicación 1-click.
- **v2:** .com automático, .com.ar asistido, catálogo+MercadoPago, más direcciones/industrias, métricas web en dashboard.
- **v3:** reservas, multi-página avanzado, multi-idioma (MX/BR), export estático si el costo Vercel escala mal.

---

## 4. ECOMMERCE (Tiendanube · Shopify · WooCommerce) — FUNDAMENTAL

**Veredicto: Tiendanube primero y con ventaja regulatoria** — partner (Socio Tecnológico) gratis, OAuth con **tokens que NO expiran**, y **distribución privada SIN homologación** → se puede lanzar con clientes piloto YA. Listar después en su App Store (homologación 4–8 sem) = canal de adquisición directo al ICP (+65.000 marcas AR).

### Arquitectura: capa propia normalizada (NO MCP, NO agregadores)
- Los agentes deben leer de **Supabase (snapshot sincronizado)**, no de la tienda en tiempo de generación (latencia/fallas/tokens). Espeja el patrón `src/lib/meta/*`:
  - `src/lib/commerce/` (oauth, client por plataforma, normalize, sync, repository con tokens cifrados).
  - Tablas: `store_connections` + `products` (normalizado: título, descripción, url, precio, promo, stock, categorías jsonb, imágenes jsonb, is_bestseller, sales_30d) + `product_sync_events`.
  - Rutas `api/integrations/{platform}/callback|webhook|sync`. Webhooks + **cron de reconciliación diaria** (nunca confiar solo en webhooks).
  - Imágenes: **copiarlas a Supabase Storage** (las URLs remotas pueden cambiar).
- Agregadores (Rutter/Apideck/Alloy): **no cubren Tiendanube** (solo API2Cart) → integrar directo.
- MCP de Shopify: buyer-side; sirve solo como quick win para leer catálogo público sin OAuth (demos/onboarding instantáneo), no para la integración real.

### Por plataforma
- **Tiendanube (2–3 sem):** OAuth restringido (code expira 5 min → token permanente). Scopes mínimos: `read_products` (+`read_orders` para bestsellers). Products con descripción HTML, imágenes, variantes, promo price, SEO, handle (→ URL para links en posts). Sin endpoint de stats → bestsellers agregando orders 30–90 días (viable). Webhooks product/* + order/* con HMAC + **3 webhooks LGPD obligatorios para homologar** (patrón conocido del deauthorize de Meta). Rate limit ~2 req/s burst 40 (500 productos ≈ 10 s).
- **Shopify (2 sem):** app pública **no listada** (custom distribution), Admin GraphQL, solo `read_products` al inicio — ⚠️ `read_orders` es *protected customer data* (aprobación aparte incluso sin listar) → bestsellers Shopify después.
- **WooCommerce (1–1,5 sem):** consumer key/secret manual (UI "pegá tus keys" con capturas), pull por cron (webhooks poco fiables en hostings AR flojos), endpoint `reports/top_sellers` existe. Fallback al scraper actual.
- **Fase 3:** Mercado Libre (tokens 6h+refresh — segmento "solo vendo por ML" real, pero fit de marca peor), Wix Stores. Empretienda: sin API pública → scraper.

### Casos de uso desbloqueados
(a) Import de catálogo con fotos al onboarding (si la URL es Tiendanube → ofrecer "Conectá tu tienda" en vez de scrapear) · (b) sync continuo · (c) **bestsellers → señal para el agente de calendario** ("post del producto estrella") · (d) links de producto en posts/ads · (e) **feeds de catálogo Meta (Catalog Batch API) y Google (Merchant API nueva — Content API muere en 2026) → ads dinámicos/Advantage+ catalog**: ninguna pyme arma su feed sola; diferenciador enorme que conecta con los frentes 1 y 2.

**Esfuerzo total: ~6–8 semanas las 3 plataformas; Tiendanube sola (~50% del valor AR) en 2–3.**

---

## 5. EMAIL MARKETING (add-on)

**Veredicto: infra propia de envío como camino principal** — el pitch "el cliente no gestiona nada" se rompe si hay que obligarlo a crear/pagar Mailchimp. El mercado valida: Mailchimp/Klaviyo/los done-for-you envían todos desde SU propia infraestructura.

### Qué permite cada plataforma existente (para los que YA tienen herramienta — Fase 3)
- **Mailchimp**: ciclo completo por API (crear → contenido → programar/enviar → métricas) + OAuth. Automations por API: flojas. Free plan 2026 casi inútil (250 contactos) → el cliente necesitaría plan pago.
- **Doppler (AR)**: crea/envía campañas por API (API key, no OAuth) + **Client Manager** (modelo agencia real, cobra en ARS). Segundo conector.
- **Perfit/"Marketing Nube" (oficial de Tiendanube)**: **NO permite crear campañas por API** (solo contactos/triggers) → descartada como backend; es el competidor instalado en Tiendanube (diferenciarse por contenido+estrategia).
- **Brevo**: API completa + sub-cuentas white-label… solo Enterprise (~USD 449+/mes) → evaluar con 50+ clientes de email.

### Infra propia (Fase 1–2)
- **Envío: Resend para MVP** (DX, React Email, encaja con Vercel; Pro USD 20/mes ≈ 50k emails) con abstracción de provider → **migrar a SES (USD 0,10/1.000)** al superar ~100–200k emails/mes. Usar solo la API de envío: **listas/segmentos/supresión viven en Supabase** (evita el pricing por contactos).
- **Mini-ESP sobre Supabase (3–5 sem):** `email_contacts`, `email_lists`, `email_campaigns`, `email_events` (webhooks delivered/open/click/bounce/complaint), **suppression list**, página de unsubscribe 1-click + header `List-Unsubscribe-Post` (obligatorio Gmail/Yahoo), warm-up progresivo + **corte automático por complaint rate >0,1%** (protege la reputación compartida).
- **Dominio de envío:** lanzar con `cliente.mail.heyloca.ai` (cero fricción, Reply-To del cliente) + upgrade guiado a subdominio del cliente (3–4 registros DNS, mejor marca/deliverability).
- **Contactos:** (1) ecommerce vía API/webhooks — Tiendanube expone customers, orders y **abandoned checkouts** → carrito abandonado gratis; (2) CSV con declaración de consentimiento (rechazar listas compradas en T&C); (3) formulario/pop-up embebible que LOCA genera para la web del cliente.
- **Legal AR (Ley 25.326):** art. 27 habilita marketing directo a datos aportados por el titular (clientes de la tienda) CON derecho de bloqueo informado en cada email; unsubscribe simple y gratuito obligatorio; **doble opt-in NO obligatorio** (best practice en forms nuevos); Registro No Llame NO aplica a email (Disposición 4/2009: asunto identificable + baja). Guardar consentimiento con timestamp + fuente (cubre MX/LGPD futuro).

### Automatizaciones de valor (solo posibles con infra propia o campañas por API)
Newsletter mensual + **promos por fechas especiales (reutiliza el calendario por industria que LOCA ya tiene)** + bienvenida + carrito abandonado + win-back (queries sobre orders en Supabase).

### Pricing y fases
- **Add-on: USD 29–39/mes hasta ~5.000 contactos.** Costo real: un cliente con 3.000 contactos × 4 campañas/mes ≈ **USD 1,20–5/mes** → margen >90%.
- **F1 (4–6 sem):** mini-ESP + newsletter + fechas especiales, Resend, subdominio LOCA, métricas en dashboard.
- **F2:** integración Tiendanube (contactos + carrito abandonado + win-back), doble opt-in en forms, dominio del cliente.
- **F3:** conectores OAuth Mailchimp → Doppler; Brevo Enterprise a escala.

---

## 6. RESTO DEL BACKLOG (de PLAN-v2 / resúmenes / memoria)

### Deuda etapa 1 que bloquea la etapa 2 (cerrar primero)
- **Cron de auto-publicación** (A5) — sin esto "LOCA publica sola" no es real. Vercel Pro o scheduler externo.
- **Meta App Review orgánico** (`instagram_content_publish`/`pages_manage_posts`) — lento, iniciar YA; es además la base del review de `ads_management`.
- **Bloque de agentes (items 13/15/21)**: prompting por tipo de contenido, modelo por tipo, prompt caching, aspect ratio por formato/red, reglas de formato por pieza. (Lo define Alan.)
- **Analytics fase 2**: pegar key PostHog + migración 0006; después session replay + `/metrics` reales.
- **Email de avisos** (D22) y **Google OAuth en signup** (TODO anotado).

### Features ya anotadas para después
- **LinkedIn** (A1): app dueña INFINIDAD, requiere dominio activo + review Community Management. Clave para B2B (ej. TSL).
- **Carrusel → Reel end-to-end** (flag de formatos) y **Stories vía API** (pendiente en `meta/publish.ts`).
- **Membresías/gating** (item 24): un negocio = una membresía; planes Esencial/Profesional/Agencia ya esbozados.
- **Curadores humanos** como capa premium enterprise (roadmap 12–24m del deck).

### Candidatos nuevos a investigar (encajan con "el cliente no gestiona nada")
- **Google Business Profile** (ficha de Maps): API para posts, reseñas, horarios — quizás el canal de mayor ROI para pymes locales después de Meta, y nadie lo gestiona.
- **WhatsApp Business Platform**: respuestas automáticas/catálogo/campañas — cierra el loop con los leads de las webs y con el mercado AR.
- **Gestión de reseñas** (Google/Facebook): Eva responde con el tono de marca.
- **Reporting mensual automático al cliente** ("qué hizo LOCA este mes y qué logró") — retención pura, casi gratis con los insights que ya traemos.
- **TikTok** (Content Posting API existe) — según perfil de clientes.

---

## 7. 🅿️ "PEDIDOS EXTRA" — sección de add-ons en la app (plan-only, NO implementar aún)

**Idea (Sebastián, 2026-08-09):** una sección en la app ("Pedidos extra" / "Pedidos especiales") donde el usuario pueda pedir más scope, contenidos distintos, web, mailing y todos los add-ons, con precio según scope. Destino de las recomendaciones que Eva/la app le hacen al usuario.

### Por qué es estratégica (más allá de UI)
- **Es la vidriera de toda la etapa 2**: cada add-on de este plan (ads, web, email, más contenidos) necesita un lugar donde venderse dentro del producto. Hoy no existe.
- **Se puede lanzar ANTES de automatizar los add-ons** (concierge MVP): el catálogo capta demanda y revenue con fulfillment manual/semi-manual, y valida qué add-on de la etapa 2 conviene construir primero con datos reales de "quién pidió qué". Des-riesga el orden de ataque.
- **Cierra el loop de recomendaciones**: dashboard/estrategia/métricas/Eva pueden empujar con contexto ("tus posts de producto funcionan → potencialos con ads", "no tenés web → pedila acá") con deep-link a la sección con el add-on preseleccionado.

### Diseño propuesto
- **Nav**: nueva entrada "Extras" (o "Pedidos") en `app-shell.tsx` + card destacada en dashboard.
- **Catálogo** (cards con precio o "según scope"): Más contenidos (+N piezas/mes) · Formatos extra (carrusel/reel cuando estén) · Web (one-shot + fee) · Email marketing · Ads Meta/Google · Pedido especial (texto libre → cotización).
- **Flujo por add-on**: elegir → 2-4 preguntas de scope (guiadas por Eva, estilo onboarding) → precio automático por tier o "te cotizamos en 24h" → confirmar → estado visible (solicitado → cotizado → aprobado → en curso → entregado).
- **Modelo de datos**: tabla `addon_requests` (business_id, type, scope_answers jsonb, status, price, currency, notes, timestamps) + eventos analytics (`addon_viewed/requested/approved`) — alimenta la decisión de qué automatizar primero.
- **Recomendaciones**: motor simple de reglas sobre datos existentes (¿tiene web? ¿tiene ecommerce conectado? ¿engagement alto? ¿pidió algo antes?) → cards contextuales + quick actions de Eva que deep-linkean a `/extras?addon=web`.
- **Pagos**: fase 1 sin checkout (se coordina/cobra por Stripe manual); fase 2 checkout Stripe integrado por add-on.

### Fases y esfuerzo
1. **F1 (~1 semana):** sección + catálogo + flujo de pedido + tabla + notificación (email/Slack interno) + estados. Fulfillment manual.
2. **F2 (~3-5 días):** recomendaciones contextuales en dashboard/estrategia/Eva con deep-links.
3. **F3:** checkout Stripe + conexión con cada add-on real a medida que se automatiza (web, email, ads).

**Riesgo principal:** prometer add-ons que aún no existen → los que no estén automatizados se muestran como "servicio con Eva + equipo" con SLA honesto ("te lo entregamos en X días"), nunca como instantáneo.

---

## 8. 🅿️ EVA GUÍA + CHAT REAL (plan-only, NO implementar aún — tema delicado)

**Idea (Sebastián, 2026-08-09):** (a) que Eva ayude a usar la plataforma con carteles indicando qué hay en cada lugar y popups en los primeros usos (avanzar/cerrar); (b) mejorar el chat para que el usuario le pida/consulte a Eva en texto libre y **Eva interprete lo que quiere y lo revalide** antes de actuar.

### Estado actual (verificado en código)
- `eva-chat.tsx`: el chat es **100% guionado** — quick actions con respuestas fijas por ruta (`contextFor(pathname)`), **sin input de texto libre y sin LLM**. Solo dispara eventos `window "eva:action"` que las páginas escuchan (modificar/imagen).
- Precedente clave: `content-feedback.ts` ya interpreta texto libre del usuario con IA y lo aplica a una pieza. El patrón "texto → interpretación → aplicar" existe; falta generalizarlo con revalidación.
- No hay sistema de tours/hints ni tracking de "primer uso" por pantalla.

### Parte A — Guía de plataforma (lo RÁPIDO, sin IA, bajo riesgo)
1. **Popups de primer uso** por pantalla (dashboard, estrategia, calendario, contenidos, métricas): 1-3 pasos con "Siguiente/Entendido/No mostrar más". Componente `FirstUseHint` + registro `seen_hints` (localStorage + columna en el perfil para que sobreviva multi-dispositivo).
2. **Coach marks / tooltips** anclados a elementos clave (botón aprobar, lápiz de edición, flag de formatos, conexión Meta) — reutilizar el tono/copys que ya tiene `contextFor`.
3. **Ampliar los guiones de Eva** a las rutas que hoy caen al default (métricas, ads, settings) — barato y suma ya.
4. Regla de oro: todo dismissible, nunca bloquear el flujo, no repetir tras "no mostrar más".
- **Esfuerzo: ~2-4 días** (A1+A2+A3). Sin dependencias. Candidato a hacerse antes que cualquier otra cosa de esta sección.

### Parte B — Chat real con interpretación + revalidación (lo DELICADO)
**Arquitectura propuesta — nunca ejecutar directo desde texto libre:**
1. **Input libre** en el panel de Eva (las quick actions quedan como atajos y como fallback si la IA falla).
2. **Endpoint `/api/eva/chat`** con un **agente router de intención** (modelo barato tipo Haiku, contexto corto: ruta actual + resumen del negocio + catálogo de acciones) que clasifica en 4 salidas:
   - **Pregunta de ayuda** → responde desde una **base de conocimiento curada** de la plataforma (destilada de FUNCTIONALITY.md a un doc de "qué se puede hacer y dónde"). Regla dura: *no inventar features* — si no está en la KB, decir "eso todavía no se puede" (+ derivar a Pedidos extra si aplica).
   - **Acción soportada** → mapea a un **catálogo tipado de acciones whitelisted** (las que ya existen como flujos: modificar contenido, regenerar imagen, modificar calendario, editar sección de estrategia, ir a X pantalla) con parámetros validados (Zod). **Eva reformula y revalida**: "Entiendo que querés que los copies sean más cortos en las 3 piezas pendientes, ¿lo hago?" → botones Sí/No → recién ahí dispara el flujo existente (`eva:action` / API). Nada se ejecuta sin confirmación explícita.
   - **Pedido fuera de scope** ("quiero una web", "hacé un video") → deriva a **Pedidos extra** con deep-link (sinergia directa con §7).
   - **Off-topic** → redirección amable al ámbito de marketing del negocio.
3. **Acciones vedadas al chat** (siempre UI): aprobar estrategia/contenidos, publicar, borrar, cambios de cuenta/billing. El chat prepara y navega; las decisiones irreversibles se tocan con el dedo.
4. **Controles**: rate limit por usuario, tope de mensajes/día por plan, log completo de conversaciones en `events` (mejora futura + soporte), tratamiento del texto del usuario como dato (no instrucciones: cuidar prompt injection — el mensaje nunca se concatena como instrucción de sistema), timeout con fallback a quick actions.
5. **Costo**: con Haiku + contexto corto, centavos por conversación; presupuestar tope mensual por usuario.

**Por qué es delicado (los riesgos que hay que diseñar, no parchear):**
- **Expectativa**: apenas Eva chatea, el usuario espera que haga TODO. La KB + derivación a Pedidos extra convierte esa frustración en pipeline de ventas en vez de churn.
- **Alucinación de features/promesas** → KB curada + "no inventar" + revalidación siempre.
- **Acciones equivocadas** → whitelist tipada + confirmación + nada irreversible por chat.
- **Coherencia**: la Eva guionada (marketing) y la Eva chat (LLM) tienen que sonar igual — reusar SYSTEM_EVA y sus copys como few-shot de tono.

**Fases:**
- **B1 (~1 semana): solo Q&A** — texto libre, responde de la KB y navega ("está en Configuración → Redes"), deriva a Pedidos extra. CERO acciones. Valida tono, costo y utilidad sin riesgo.
- **B2 (~1-2 semanas): acciones con revalidación** — whitelist chica (modificar contenido/calendario/imagen, editar estrategia) reutilizando los flujos existentes.
- **B3:** ampliar catálogo de acciones + memoria de conversación + Eva proactiva ("veo que no aprobaste el calendario, ¿te ayudo?").

**Dependencia recomendada:** hacer B después del bloque de agentes (items 13/15/21 de PLAN-v2, lo define Alan) para no construir dos veces la capa de prompts/modelos.

---

## ORDEN DE ATAQUE PROPUESTO

### Trámites lentos — INICIAR YA (todos en paralelo, ninguno bloquea dev)
1. **Google Ads: crear los 2 MCC (API + operativo) y solicitar developer token Basic** (backlog reconocido por Google; caso de uso detallado).
2. **Meta: App Review orgánico pendiente** + preparar el de `ads_management` (screencast).
3. **Tiendanube: registrarse como Socio Tecnológico** (gratis, da tienda demo) y crear la app privada.
4. **Contador: validar** (a) tratamiento impositivo del cliente AR pagando pauta/servicios a la LLC; (b) monthly invoicing con Google Argentina SRL (rep de Google).

### Secuencia de desarrollo (por efecto multiplicador)
0. **Quick wins de producto**: guía de plataforma (§8 Parte A, ~2-4 días) y **Pedidos extra F1** (§7, ~1 semana) — la sección de extras conviene ANTES de los add-ons: capta demanda real y valida qué construir primero.
1. **Ecommerce — Tiendanube** (2–3 sem): capa `commerce` + OAuth + import al onboarding + webhooks + bestsellers. Desbloquea contenido mejor YA y alimenta ads/email/webs.
2. **Email marketing F1** (4–6 sem): mini-ESP + newsletter + fechas especiales. Primer add-on de revenue (USD 29–39), margen >90%, sin dependencias externas.
3. **Meta Ads Fase A** (1–2 meses): OAuth cuenta del cliente + motor de campañas Advantage+ + loop de optimización + reporte semanal de Eva. Valida el producto de ads sin riesgo financiero.
4. **Webs MVP** (4–8 sem, paralelizable con 3 si hay manos): add-on USD 199 + 19/mes; genera leads medibles que mejoran ads.
5. **Google Ads MVP** (después del token Basic): Search base + tarjeta del cliente; reutiliza el motor de reglas/reportes de Meta Ads.
6. **Shopify + Woo** (3–4 sem) + **feeds de catálogo Meta/Google** → ads dinámicos.
7. **Fase B de ads** (BM de medios LLC + prepago wallet + spending limits) cuando el piloto de ads valide demanda.
8. **Email F2** (carrito abandonado con Tiendanube) + homologación App Store Tiendanube.

### Estructura de planes resultante (borrador para iterar)
| | Contenidos (hoy) | + Ads | + Email | + Web |
|---|---|---|---|---|
| Base USD 89–105/mes | ✓ | | | |
| Ads Starter/Growth/Scale | | +49 / +99 / 10% spend (mín 149) | | |
| Email hasta 5k contactos | | | +29–39 | |
| Web one-shot + hosting | | | | 199–299 + 19/mes |

Un cliente "full" ≈ USD 185–250/mes + pauta — sigue siendo ~10x más barato que una agencia humana con el mismo alcance.

### Riesgos transversales
- **Policy compliance de creatividades** (Meta+Google): construir UN validador pre-publicación compartido. Ventaja: Eva genera todo → compliance garantizable.
- **Nunca mezclar**: BM de la app (INFINIDAD) ≠ BM de medios; MCC del token ≠ MCC operativo.
- **Prepago estricto siempre** (wallet + spending limits nativos); jamás financiar pauta al cliente.
- **Transparencia obligatoria** (Google la exige por policy; en Meta conviene): fee siempre separado del costo de plataforma en facturas y reportes.
