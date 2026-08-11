# Investigación FASE 2: Webs automáticas para clientes LOCA

> Research profundo, ago 2026. Resumen accionable en `PLAN-etapa2.md` §3.

## 1. Mercado y benchmarks

### Herramientas AI "done-for-you" — qué generan y qué cobran

| Herramienta | Qué genera | Pricing | Modelo |
|---|---|---|---|
| **Durable** | Sitio en 30 seg + CRM, invoicing, SEO, imágenes IA | Free / Launch **$25/mes** / Grow **$99/mes** | Solo mensual, sin one-shot |
| **Mixo** | Landings simples (1–5 páginas) | **$9–39/mes** (dominio gratis 1er año) | Mensual |
| **10Web** | Sitios WordPress con IA; tiene **API white-label para agencias/SaaS** | $10–23/mes; API/reseller aparte | Mensual + reseller dashboard |
| **B12** | IA + **revisión humana** (el híbrido más parecido a LOCA) | Basic **$42/mes** → Advanced **$339/mes** | Mensual, humanos incluidos |
| **Wix Studio / AI** | Template-matching con IA ("Harmony" reemplazó a ADI) | $19–159/mes | Mensual |
| **Hostinger AI** | Builder básico + hosting | **$2.7–9/mes** (piso del mercado) | Mensual |
| **Framer AI** | Layouts editables reales, breakpoints automáticos | $10 / $30 / $100/mes + $20/editor | Mensual |
| **Lovable** | Apps React+Supabase completas por chat | $25/mes por créditos | Mensual por créditos |

Puntos clave:
- **Nadie cobra one-shot**: el mercado DIY es suscripción. El modelo one-shot + fee es de **agencia** — el cliente pyme compara contra los $250–1.500 de una agencia, no contra los $9 de Mixo (que no sabe usar).
- **B12 es el comparable directo**: IA genera, humanos revisan, $42–339/mes. LOCA lo hace con Eva.
- **Revisiones**: los builders DIY no limitan (editás vos); los done-for-you incluyen revisión en el fee. El límite de rondas es práctica de agencia (§5).
- **10Web tiene API white-label** pero es WordPress (no encaja con el pitch ni el stack).

### Benchmark de precio agencia humana

- **Argentina 2025/26**: landing profesional **AR$350.000–500.000 (~USD 250–400)**; institucional pyme **AR$800.000–1.500.000 (~USD 600–1.200)**; e-commerce custom AR$2.5M+. Una pyme gasta **USD 350–2.000 el primer año** ([Tecnesio](https://tecnesio.com.ar/blog/cuanto-cuesta-una-pagina-web-en-argentina/), [La Fuerza](https://lafuerzamarketing.com.ar/cuanto-cuesta-pagina-web-argentina-2026/), [BigRedes AR](https://bigredes.com/precio-de-diseno-de-paginas-web-en-argentina/)).
- **México**: MXN 15.000–200.000; el segmento pyme "presencia completa + SEO" arranca en **USD 1.200 y llega a 3.500** ([NewEmage](https://newemage.com.mx/cuanto-cuesta-una-pagina-web-en-mexico/)).
- **Colombia**: **USD 950–10.000** ([BigRedes CO](https://bigredes.com/precio-de-diseno-de-paginas-web-en-colombia/)).

**Conclusión**: hay espacio para un one-shot de **USD 149–349** que sea 3–5x más barato que la agencia más barata con margen brutal (costo marginal <USD 10).

## 2. Arquitectura técnica

### a) Multi-tenant vs. estático por cliente vs. código único

| Opción | Pros | Contras |
|---|---|---|
| **A. Multi-tenant Next.js en Vercel** (1 deployment, N sitios por hostname, contenido en Supabase) | Mismo stack; [Platforms Starter Kit](https://github.com/vercel/platforms); dominios ilimitados con SSL automático (soft limit [100k dominios/proyecto en Pro](https://vercel.com/docs/multi-tenant/limits)); editar = actualizar filas en DB; un codebase | Riesgo "todas iguales" si es plantilla + datos; un bug tumba N sitios; compute/bandwidth crecen con tráfico agregado |
| **B. Estático generado por cliente** (IA genera Astro/HTML → build → Cloudflare) | Lighthouse ~100, costo ≈ centavos, aislamiento, libertad de diseño real | Pipeline de build por cliente; editar = regenerar; Cloudflare Pages limita [100 proyectos/cuenta](https://developers.cloudflare.com/pages/platform/limits) → a escala un Worker router + assets en R2, o [Workers for Platforms](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/) ($25/mes, 1.000 scripts) |
| **C. Código único por cliente** (repo/proyecto por sitio, estilo Lovable) | Máxima unicidad | Inviable a 100–1000 sitios: N builds, N deployments, N mantenimientos |

**Recomendación: híbrido A+B — "componentes multi-tenant, diseño por sitio".** Un runtime multi-tenant donde lo que se guarda por cliente es un **"site spec" completo**: design tokens, orden y variante de cada sección, copy, imágenes. El runtime es una biblioteca de ~40–60 variantes de sección que se componen según el spec. Da 90% de la variación visual de B con el costo operativo de A; las 3 rondas de feedback son mutaciones del spec (sin rebuilds). Si Vercel duele después, el mismo spec se "bakea" a estático sin cambiar el generador.

### b) Dominios custom y compra de dominios

**Servir dominios custom:**
- **Vercel**: dominios custom **ilimitados sin costo por dominio** en Pro ($20/asiento/mes), SSL automático, [API para agregarlos](https://vercel.com/docs/platforms/multi-tenant-platforms/configuring-domains). Ganador si se queda en Vercel.
- **Cloudflare for SaaS**: [100 hostnames gratis, luego $0.10/hostname/mes](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/) → 1.000 sitios ≈ $90/mes.

**Comprar dominios (API):**
- **Vercel Registrar API** (nuevo): [search, pricing, purchase, renovación y nameservers por API](https://vercel.com/docs/domains/registrar-api), "a precio de registrar". **Menor fricción con el stack**: comprar + attachear en el mismo flujo.
- **Porkbun**: ~[$11/año .com, API moderna](https://propicked.com/hosting/compare/porkbun-vs-namecheap) — mejor precio/API standalone. Namecheap similar pero API vieja (whitelist de IP + saldo mínimo). name.com / OpenSRS / ResellerClub: [mayoristas](https://opensrs.com/domains/pricing), tienen sentido a 500+ dominios/año.
- **.com.ar — el punto duro**: **NIC.ar NO tiene API de registro**, solo [RDAP para consultas](https://nic.ar/es/enterate/novedades/nuevo-servicio-de-rdap). Exige **CUIT + Clave Fiscal nivel 3 del titular** ([instructivo](https://nic.ar/es/ayuda/instructivos/registro-de-dominio)). Costo: **AR$8.500/año** (~USD 7; [aranceles](https://nic.ar/es/dominios/aranceles)). Ningún registrar internacional lo revende por API; gestores tipo [DonWeb lo tramitan](https://donweb.com/es-ar/dominio-com-ar) manualmente. **Recomendación**: flujo asistido — Eva da el instructivo y LOCA solo pide la **delegación DNS**. Para .com, compra 100% automática. Subdominio gratis (`cliente.heyloca.site`) como default.

### c) Costo real por sitio → margen del fee

| Concepto | Costo/sitio/mes (a 100–1000 sitios) |
|---|---|
| Hosting multi-tenant Vercel (Pro + usage; tráfico pyme bajísimo) | ~USD 0.10–0.50 |
| Hosting estático Cloudflare | ~USD 0.03–0.10 |
| Dominio .com | ~USD 0.90–1.30 |
| Dominio .com.ar | ~USD 0.60 |
| IA de generación (one-shot + 3 rondas, Claude + Gemini) | USD 2–8 **una vez** |
| **Total recurrente** | **< USD 2/mes** |

Un fee de **USD 19/mes tiene ~90% de margen bruto**. Venderlo como *hosting + dominio + SSL + mantenimiento + cambios menores por chat con Eva*.

## 3. Anti-"todas iguales" — técnicas concretas

Por qué pasa: los LLM sin restricciones convergen al patrón estadísticamente más común — hero centrado, 3 cards, Inter, gradiente azul-violeta ([Shuffle](https://shuffle.dev/blog/2026/01/why-do-most-ai-generated-websites-look-the-same/), [dev.to](https://dev.to/alanwest/how-to-fix-the-ai-generated-look-in-your-frontend-1ahh)). La tesis: *"AI doesn't lack creativity, it lacks direction"* — las decisiones de diseño se toman **antes** de generar.

**Sistema recomendado (en orden de impacto):**

1. **Style guide primero, sitio después (modelo Relume).** [Relume genera un style guide](https://www.relume.ai/style-guide) como paso separado y compone con [1.000+ componentes que lo heredan](https://www.relume.ai/). LOCA ya tiene brand kit del onboarding: un agente "Design Director" deriva un **theme token set** (paleta extendida, par tipográfico, radios, densidad, sombras/bordes) persistido en el site spec. El LLM nunca inventa un hex.
2. **Biblioteca de secciones con variantes reales + composición controlada.** No 1 plantilla con textos cambiados (el error de Wix ADI, ["template selector con sabor a IA"](https://chilledsites.com/wix-ai-website-builder)): p.ej. 6 heros estructuralmente distintos, 5 variantes de servicios, 4 de testimonios, 3 de CTA/WhatsApp. Con ~45 variantes y reglas de composición hay miles de combinaciones; guardar hash de combinación y evitar colisiones entre clientes cercanos/misma industria.
3. **Ejes de "personalidad" curados, no aleatoriedad pura.** 5–7 direcciones estéticas (cálido-artesanal, clínico-confiable, premium-oscuro, colorido-joven, editorial-serio…) elegidas por industria + tono. Aleatorizar *dentro* de la dirección. 15–20 pares tipográficos pre-aprobados; **prohibir Inter/gradiente-violeta como default**.
4. **Imágenes propias = el diferenciador más barato.** Pipeline Gemini + fotos reales del onboarding: un sitio con fotos del local real + imágenes con la paleta de marca nunca parece template. Los builders usan stock.
5. **Design systems por industria**: presets de secciones y jerarquía por vertical (gastronomía → menú/fotos/reservas arriba; profesional → credibilidad/formulario; comercio → catálogo/WhatsApp). Es lo que hace que *convierta*, no solo que se vea distinto.
6. **Los demás**: Framer genera layers editables sobre su sistema de layout (variedad media, calidad alta); Durable/Wix son plantillas rígidas; Relume es el único que lo resolvió bien. **El modelo Relume automatizado por Eva es el que hay que copiar.**

## 4. Features mínimas de una web pyme que convierte (AR/LATAM)

**Núcleo de conversión (MVP):**
- **CTA WhatsApp** flotante + por sección, `wa.me` con **mensaje precargado contextual**. El 65%+ de los negocios argentinos venden por WhatsApp ([ITPago](https://itpago.com/blog/catalogo-whatsapp-business-argentina-5-claves-actualizadas-2026)); el flujo esperado es "ver productos → Consultar → WhatsApp con mensaje listo" ([CatálogoAR](https://catalogoar.com/blog/mejores-plataformas-catalogo-whatsapp-argentina)).
- **Formulario → email + registro en Supabase** (lead visible en el dashboard LOCA — el add-on se vuelve fuente de datos del resto del producto).
- **Google Maps embed** + horarios + click-to-call.
- **Catálogo simple** (grilla con precio opcional y botón WhatsApp por ítem) — sin carrito en MVP.
- **Link de pago MercadoPago** (link/botón, no checkout — [integración simple](https://neowyze.tech/blog/como-integrar-mercadopago-en-mi-web)) — muy pedido, cero comisión para LOCA.

**SEO técnico + medición (automático):**
- Meta title/description por página, OG tags, **schema.org LocalBusiness**, sitemap.xml, robots.txt, canonical.
- **PostHog** con eventos: click WhatsApp, submit form, click MercadoPago — y mostrarlas en el dashboard ("tu web generó 14 consultas este mes" = retención del fee).
- Mobile-first (tráfico pyme AR ~80% móvil), Core Web Vitals en verde.
- **Multi-idioma: NO para MVP** (agregar EN/PT con expansión MX/BR o rubros turísticos).

## 5. Flujo de feedback en 3 instancias

Estándar de industria: **2–3 rondas consolidadas**; más es scope creep, y "revisión" ≠ "concepto nuevo" ([DailyGit](https://www.dailygit.com/how-many-revisions-should-web-design-include-industry-standards-explained/), [Prominent](https://prominentweb.com/blog/what-are-web-design-revisions-and-how-many-are-allowed/)). Estructura embebida en el chat con Eva:

- **Ronda 1 — Estructura y contenido**: secciones, servicios, precios, orden. Eva pregunta sección por sección. Cambios estructurales solo acá.
- **Ronda 2 — Diseño y estilo**: Eva ofrece **2–3 variantes de dirección estética generadas** para elegir (elegir consume menos rondas que describir). Regenerar = mutar tokens, barato.
- **Ronda 3 — Detalles finales**: micro-ediciones.

Reglas: cada ronda es **feedback consolidado** (batch, límite ~15 mensajes/ronda); aprobar congela ese nivel; post-publicación, **cambios menores por chat incluidos en el fee (2–3/mes)** — retención pura. **Chat con Eva > editor visual**: el cliente pyme no quiere aprender un editor (por eso paga agencias); un editor visual sería reconstruir Framer — no hacerlo.

## 6. Recomendación final

**Arquitectura**: Multi-tenant Next.js en Vercel sirviendo N sitios por hostname desde un **site spec en Supabase** (tokens + secciones + copy + imágenes). Biblioteca propia de ~45 variantes + 5–7 direcciones estéticas curadas. Generación: Design Director (tokens) → contenido (copy con tono del onboarding, Claude) → composición → imágenes Gemini + fotos del cliente. Dominios: subdominio gratis default; .com vía **Vercel Registrar API**; .com.ar asistido. Migración futura a estático posible.

**Pricing sugerido (USD, LATAM)**:
- **One-shot**: **USD 199** sin web / **USD 299** renovación (incluye migración de contenido). Solo para suscriptores LOCA. Ronda extra USD 49.
- **Mensual**: **USD 19/mes** (hosting + SSL + dominio .com + analytics + 2–3 cambios menores). Margen ~90%.

**Fases**:
- **MVP (4–8 semanas)**: 3 industrias top del piloto, 45 variantes, tokens desde brand kit, subdominio heyloca.site, WhatsApp + form + Maps + SEO + PostHog, 3 rondas por chat, publicación 1-click.
- **v2**: .com automático, .com.ar asistido, catálogo + MercadoPago, más direcciones/industrias, métricas en dashboard, cambios post-publicación por chat.
- **v3**: multi-página avanzado, reservas, multi-idioma, export estático a Cloudflare si el costo Vercel escala mal.

**Riesgos**:
1. Expectativa de edición DIY → mensaje claro: se edita hablando con Eva; es feature.
2. Scope creep post-ronda 3 → límite duro + cambios menores en el fee.
3. **Titularidad de dominios**: siempre a nombre del cliente (o explícito en T&C); en .com.ar es forzoso (CUIT del titular).
4. Churn del fee: downgrade a subdominio con banner, no borrado inmediato (T&C).
5. Deuda de mantenimiento: mejor 45 variantes excelentes que 200 mediocres.
6. Calidad percibida: invertir en curaduría humana inicial de direcciones estéticas y tipografías — es lo que separa el add-on de un wrapper de LLM.

**Fuentes**: [Durable pricing](https://hostadvice.com/hosting-company/durable-reviews/) · [Mixo/B12/10Web](https://superframeworks.com/articles/best-ai-website-builders) · [B12 pricing](https://www.g2.com/products/b12-ai-website-builder/pricing) · [10Web white-label](https://10web.io/white-label-website-builder/) · [Framer AI](https://www.framer.com/ai/) · [Lovable pricing](https://www.eesel.ai/blog/lovable-pricing) · [Wix ADI→Harmony](https://www.wix.com/blog/wix-artificial-design-intelligence) · [Precios AR](https://tecnesio.com.ar/blog/cuanto-cuesta-una-pagina-web-en-argentina/) · [Precios MX](https://newemage.com.mx/cuanto-cuesta-una-pagina-web-en-mexico/) · [Vercel multi-tenant](https://vercel.com/docs/multi-tenant) · [Vercel Registrar API](https://vercel.com/docs/domains/registrar-api) · [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/) · [NIC.ar aranceles](https://nic.ar/es/dominios/aranceles) · [Relume style guide](https://www.relume.ai/style-guide) · [Shuffle: AI sites look the same](https://shuffle.dev/blog/2026/01/why-do-most-ai-generated-websites-look-the-same/) · [Revision rounds](https://www.dailygit.com/how-many-revisions-should-web-design-include-industry-standards-explained/) · [WhatsApp pymes AR](https://catalogoar.com/blog/mejores-plataformas-catalogo-whatsapp-argentina) · [MercadoPago en web](https://neowyze.tech/blog/como-integrar-mercadopago-en-mi-web)
