# Investigación FASE 2: Integración ecommerce para LOCA

> Research profundo, ago 2026. Resumen accionable en `PLAN-etapa2.md` §4.

## Resumen ejecutivo

**Recomendación central: Tiendanube primero, con app propia + OAuth + capa normalizada en Supabase sincronizada por webhooks.** Es la plataforma dominante en el segmento pyme argentino (+65.000 marcas activas en AR), su API es simple (REST + JSON, tokens que no expiran), permite **distribución privada sin pasar por homologación** para arrancar, y listar la app después en su tienda de apps es un canal de adquisición real. Shopify segundo (esfuerzo mayor por review de "protected customer data" para órdenes), WooCommerce tercero (fricción alta, pero barato de soportar en modo "solo catálogo"). MCP no reemplaza la API directa para este caso; los agregadores no cubren Tiendanube.

## 1. Tiendanube / Nuvemshop (prioridad #1)

**Docs:** [DevHub](https://dev.tiendanube.com/docs/applications/authentication) · [API reference](https://tiendanube.github.io/api-documentation/intro) · [Autenticación](https://tiendanube.github.io/api-documentation/authentication) · [Product](https://tiendanube.github.io/api-documentation/resources/product) · [Order](https://tiendanube.github.io/api-documentation/resources/order) · [Webhooks](https://tiendanube.github.io/api-documentation/resources/webhook)

**Autenticación y modelo de app**
- Registro como **partner (Socio Tecnológico)** en el Partner Portal, app desde la sección "Apps". Gratis; incluye tienda demo gratuita de por vida.
- OAuth 2 (authorization code): el merchant instala → redirect con `code` (expira en 5 min) → POST a `https://www.tiendanube.com/apps/authorize/token` → **access token que NO expira** (solo se invalida al desinstalar o re-autorizar). La respuesta incluye `user_id` = store id.
- **Dos modos de distribución**: **App Store** (pública, requiere homologación) y **distribución privada** (solo merchants elegidos, sin listar). Se puede lanzar en privado con clientes piloto YA y homologar después.
- Scopes: pedir solo `read_products` (+ `read_orders` para bestsellers; evitar `read_customers` al principio — simplifica homologación).

**Datos disponibles (excelente fit)**
- `GET /products`: nombre, **descripción (HTML)**, `images[]` (URLs + position), `variants[]` (hasta 1.000: price, promotional_price, stock, SKU, peso/dimensiones), categories, brand, tags, SEO, `handle` (→ URL del producto para links en posts), visibilidad. Multiidioma (`{"es":…, "pt":…}`). Filtros `updated_at_min`, `created_at_min`, `category_id`, `published` → sync incremental trivial.
- `GET /categories`: árbol completo.
- `GET /orders`: line items, totales, payment_status, filtros. **No hay stats agregadas** → bestsellers se calculan agregando órdenes de 30–90 días (viable; tope ~10.000 items paginados).
- **Webhooks**: `product/created|updated|deleted`, `category/*`, `order/created|paid|…`, `app/uninstalled`. Registro por `POST /webhooks`, verificación HMAC-SHA256 (`x-linkedstore-hmac-sha256`), retries hasta 48h. **Obligatorios para homologar**: 3 webhooks LGPD (`store/redact`, `customers/redact`, `customers/data_request`) — patrón ya conocido del deauthorize de Meta.
- **Rate limits**: leaky bucket ~2 req/s, burst 40 (headers `X-Rate-Limit-*`). 500 productos ≈ 10 s.

**Homologación / App Store ([guía](https://dev.tiendanube.com/docs/homologation/publication))**
- Requisitos: webhooks LGPD, scopes mínimos, revisión técnica, FAQ, soporte en idioma local, assets (banner 1600×800, icono 600×600). Contacto: publicacion@tiendanube.com. Presupuestar 4–8 semanas; **no bloquea el lanzamiento privado**.
- Beneficio: la categoría "Marketing" de su App Store es un canal de adquisición directo al ICP de LOCA. [Programa de socios tecnológicos](https://www.tiendanube.com/socios/tecnologicos): visibilidad + soporte; revenue share solo aplica a payments/shipping.

## 2. Shopify

**Docs:** [Tipos de app / tokens](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin) · [Scopes](https://shopify.dev/docs/api/usage/access-scopes) · [Protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data)

- **Custom app** (una por tienda): el merchant la crea y pasa el token. Sin review, pero no escala. Solo para 1–2 clientes puntuales.
- **App pública con OAuth**: creada en el Partner/Dev Dashboard. Se puede distribuir **sin listar** (custom distribution por link) o listada (review completo). Admin **GraphQL** API (REST legacy).
- **Trampa importante:** `read_orders` es **protected customer data** → requiere solicitud y aprobación en el Partner Dashboard incluso sin listar (solo dev stores exentas), con requisitos de privacidad. `read_products` NO tiene ese problema. → **Fase 2a Shopify: solo catálogo, bestsellers después.** `read_all_orders` (histórico >60 días) es otra aprobación (~7 días hábiles).
- Webhooks nativos + webhooks GDPR obligatorios.
- **MCP de Shopify (ago-2026):** 4 servers oficiales ([Storefront MCP](https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront), [Storefront Catalog MCP](https://shopify.dev/docs/agents/catalog/storefront-catalog) — migrado a UCP abr-2026 —, Dev MCP, checkout en preview). El Storefront MCP (`https://{shop}.myshopify.com/api/mcp`) **no requiere auth** y expone `search_catalog`/`get_product`/carrito. Diseñado **buyer-side**. **Veredicto:** quick win para leer catálogo público sin OAuth ni app (mejor que scrapear), pero sin órdenes, productos ocultos, webhooks ni variantes completas → para la integración real, Admin API.

## 3. WooCommerce

**Docs:** [REST API](https://developer.woocommerce.com/docs/apis/rest-api/) · [Referencia v3](https://woocommerce.github.io/woocommerce-rest-api-docs/)

- Auth por tienda: **consumer key/secret** que el merchant genera a mano (WooCommerce → Ajustes → Avanzado → REST API; basic auth sobre HTTPS). Expone `wp-json/wc/v3/products` (imágenes, variaciones, precios, categorías, descripciones) y `/orders`; hay `/reports/top_sellers`. Webhooks configurables vía API, firmados con secret.
- **Fricción real:** copiar/pegar keys (o plugin conector propio — esfuerzo extra). Parque AR: hosting compartido flojo, WP desatendido, HTTPS/permalinks mal configurados → la API falla en un % no menor. Presupuestar tolerancia a errores y modo degradado (fallback al scraper actual).
- Veredicto: soportarlo en modo **pull manual + cron** (webhooks poco fiables), UI "pegá tus keys" con instructivo con capturas.

## 4. MCP vs API directa vs agregadores → **capa propia normalizada**

**Recomendación firme: capa propia.**
- Los agentes de LOCA no deben depender de la latencia/disponibilidad de la tienda en tiempo de generación: leen de **Supabase** (snapshot sincronizado), igual que hoy leen el brand kit. MCP remoto en cada corrida suma latencia, fallas y tokens; Tiendanube y Woo no tienen MCP oficial (solo un [MCP comunitario de Tiendanube](https://github.com/ropu/MCP-tienda_nube), no apto para producción).
- Un modelo `Product` unificado habilita todos los casos de uso (contenido, ads, feeds, email) con una sola forma de datos; el "contexto de catálogo" se inyecta al prompt como JSON compacto.
- **Agregadores:** [Rutter](https://www.apideck.com/blog/rutter-alternatives) (enterprise, sin Tiendanube), Apideck (sin Tiendanube), Alloy (iPaaS). Solo [API2Cart soporta Tiendanube](https://api2cart.com/supported-platforms/tiendanube-integration/). Para 3 plataformas donde la #1 es Tiendanube, **no valen la pena**.

**Arquitectura propuesta** (espeja `src/lib/meta/*` + `0003_meta_connections.sql`):
- `src/lib/commerce/` con `oauth.ts`, `client-{tiendanube,shopify,woo}.ts`, `normalize.ts`, `sync.ts`, `repository.ts` (tokens cifrados con el patrón de `crypto.ts` de Meta).
- Migración: `store_connections` (business_id, platform, store_id, token cifrado, scopes, status, last_sync_at) + `products` (business_id, external_id, platform, title, description, url, price, promotional_price, currency, stock, categories jsonb, images jsonb, tags, is_bestseller, sales_30d, created/updated_at_remote, synced_at) + `product_sync_events`.
- Rutas: `api/integrations/{platform}/callback`, `/webhook` (HMAC), `/sync` (import inicial + cron de reconciliación diaria — nunca confiar solo en webhooks).
- Bestsellers: job diario que agrega orders de 30/90 días → `sales_30d`; el agente de calendario/contenido recibe "top 5 más vendidos + últimos 5 creados".
- Imágenes: **copiarlas a Supabase Storage** (las URLs remotas pueden cambiar).

## 5. Otras plataformas AR/LATAM

- **Mercado Libre / Mercado Shops** ([docs](https://developers.mercadolibre.com.ar/en_us/authentication-and-authorization)): API madura (items, orders, users; Mercado Shops usa la misma). OAuth con tokens de **6 h + refresh single-use válido 6 meses** → más mantenimiento. Relevancia enorme en AR, **pero** el vendedor típico es marketplace-first (sin "marca") y muchos clientes de Tiendanube ya sincronizan con ML (órdenes con `channel: "meli"`). **Fase 3** — para el segmento "solo vendo por ML". Nota: links a ML en posts promocionan el marketplace, no la tienda propia.
- **Empretienda**: popular entre microemprendedores AR, **sin API pública documentada**. Cubrir con el scraper.
- **Wix Stores** ([Catalog API](https://dev.wix.com/docs/rest/business-solutions/stores/catalog/introduction)): API decente pero en migración Catalog V1→V3 y requiere app en el Wix App Market. Base AR chica. **Fase 3+.**

## 6. Validación técnica de los casos de uso

| Caso | Tiendanube | Shopify | Woo |
|---|---|---|---|
| (a) Import catálogo + fotos en onboarding | ✅ `GET /products` paginado | ✅ GraphQL bulk | ✅ `wc/v3/products` |
| (b) Sync continuo | ✅ webhooks + cron | ✅ webhooks | ⚠️ cron |
| (c) Bestsellers/novedades | ✅ agregando orders | ⚠️ requiere aprobación protected data | ✅ `reports/top_sellers` |
| (d) Links de producto en posts/ads | ✅ `handle` + dominio | ✅ `onlineStoreUrl` | ✅ `permalink` |
| (e) Feeds Meta/Google | ✅ con el catálogo en Supabase, LOCA genera el feed (CSV/XML o [Catalog Batch API de Meta](https://adadvisor.ai/blog/how-to-set-up-product-catalog-meta)) → Advantage+ catalog ads. Google: **Merchant API** nueva (Content API for Shopping se apaga en 2026). Diferenciador enorme para ads: ninguna pyme arma su feed sola. | idem | idem |

## 7. Plan recomendado

1. **Ya / semana 1:** registrarse como partner Tiendanube (gratis) y crear la app en modo privado. En paralelo, migración `store_connections` + `products` y capa `src/lib/commerce/`.
2. **Sprint 1–2 (Tiendanube, ~2–3 semanas eng):** OAuth + import al onboarding (si detectan dominio `*.mitiendanube.com` o meta tags de Tiendanube → ofrecer "Conectá tu Tiendanube" en vez de scrapear) + webhooks product/* + LGPD + cron reconciliación.
3. **Sprint 3 (~1 semana):** bestsellers (read_orders + agregación diaria) → señal para el agente de calendario ("post de producto estrella").
4. **En paralelo (negocio):** iniciar homologación para el App Store de Tiendanube (4–8 sem, canal de adquisición).
5. **Fase 2b Shopify (~2 semanas):** app pública no listada, solo `read_products`; quick win previo: catálogo público vía Storefront MCP/UCP sin OAuth para demos/onboarding instantáneo.
6. **Fase 2c WooCommerce (~1–1,5 semanas):** keys manuales + cron pull, fallback al scraper.
7. **Fase 3:** Mercado Libre, feeds Meta/Google desde el catálogo unificado, Wix.

**Esfuerzo total fase 2: ~6–8 semanas** para las 3 plataformas; Tiendanube sola (~50% del valor AR) en 2–3.

Fuentes: [Auth Tiendanube](https://dev.tiendanube.com/docs/applications/authentication) · [Product API](https://tiendanube.github.io/api-documentation/resources/product) · [Webhooks](https://tiendanube.github.io/api-documentation/resources/webhook) · [Publicación de apps](https://dev.tiendanube.com/docs/homologation/publication) · [Socios tecnológicos](https://www.tiendanube.com/socios/tecnologicos) · [Shopify protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data) · [Shopify Storefront MCP](https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront) · [Woo REST API](https://developer.woocommerce.com/docs/apis/rest-api/) · [Mercado Libre auth](https://developers.mercadolibre.com.ar/en_us/authentication-and-authorization) · [Wix Stores Catalog](https://dev.wix.com/docs/rest/business-solutions/stores/catalog/introduction) · [Tiendanube 65k marcas AR](https://www.forbesargentina.com/negocios/ventas-online-marcas-tienda-propia-facturaron-casi-2-billones-pese-caida-consumo-presion-china-n86751) · [API2Cart Tiendanube](https://api2cart.com/supported-platforms/tiendanube-integration/)
