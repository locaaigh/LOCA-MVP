# FASE 2 LOCA: Google Ads 100% automático — Investigación

> Research profundo, ago 2026. Resumen accionable en `PLAN-etapa2.md` §2.

## 1. Google Ads API: qué se puede gestionar programáticamente

**Cobertura funcional: prácticamente todo lo que LOCA necesita.** La API soporta creación y gestión completa de campañas [Search, Performance Max, Display, Demand Gen, Shopping, App, Video, Local Services](https://developers.google.com/google-ads/api/docs/campaigns/overview): presupuestos, estrategias de puja (tCPA, tROAS, Maximize Conversions), keywords, anuncios responsivos de búsqueda (RSA), asset groups de PMax, segmentación geográfica, extensiones/assets, conversiones y reporting completo.

**Novedades críticas 2026:**
- **Smart Campaigns: MUERTAS para creación vía API desde el 3 de agosto de 2026.** Se pueden seguir editando las existentes, pero no crear nuevas. Google recomienda migrar a PMax o Search ([blog oficial de Google Ads Developers](https://ads-developers.googleblog.com/2026/06/changes-to-support-for-smart-campaigns.html), [Search Engine Land](https://searchengineland.com/google-ads-api-to-stop-supporting-new-smart-campaign-creation-480999)). LOCA debe construir sobre **Search + PMax** directamente.
- **Display está migrando a Demand Gen**: desde junio 2026 hay migración voluntaria y luego será forzosa. Las "campañas locales" ya no existen (se absorbieron en PMax en 2022).
- **PMax vía API está totalmente soportado**: [creación de campaña](https://developers.google.com/google-ads/api/performance-max/create-campaign) + [asset groups](https://developers.google.com/google-ads/api/performance-max/asset-groups) (mínimos de assets: headlines, descripciones, imágenes, logo; todo en un solo request atómico). Encaja perfecto con el generador de contenido de Eva.

**Developer token — niveles de acceso** ([doc oficial](https://developers.google.com/google-ads/api/docs/api-policy/access-levels)):

| Nivel | Cuentas | Límite ops/día | Aprobación |
|---|---|---|---|
| Test | Solo test | 15.000 | Automático |
| **Explorer** (nuevo) | Producción + test | 2.880 | Automático, sin solicitud |
| **Basic** | Producción + test | 15.000 | ~5 días hábiles (hoy con backlog) |
| Standard | Producción | Ilimitado | ~10 días hábiles + RMF |

- **Explorer NO sirve para producción real**: bloquea creación de cuentas, gestión de usuarios, keyword planning y billing ([ppc.land](https://ppc.land/google-faces-developer-token-application-backlog-as-new-api-tier-debuts/)). Sirve para prototipar contra cuentas reales.
- **Basic es el nivel objetivo del MVP.** Google reconoció en febrero 2026 un **backlog importante** en aprobaciones. Para acelerar: cuentas activas linkeadas al MCC del token, verificación de anunciante completada, brand verification, y descripción de caso de uso detallada — las solicitudes vagas se rechazan.
- **RMF (Required Minimum Functionality)** solo aplica a **Standard Access** ([doc RMF](https://developers.google.com/google-ads/api/docs/productionize/access-levels)). Como el cliente de LOCA **no gestiona nada** (solo aprueba estrategia y presupuesto), hay argumento para clasificarse como herramienta interna de agencia con RMF reducido — **no confirmado**, se define al pedir Standard. Con Basic (15.000 ops/día) alcanza para decenas/cientos de clientes en el piloto.

## 2. Estructura de cuentas: crear vs. vincular

**Opción A — Crear cuentas bajo el MCC vía API (`CustomerService.CreateCustomerClient`)** ([doc](https://developers.google.com/google-ads/api/docs/account-management/create-account)):
- Sí se puede: se especifica el customer ID del MCC y un objeto `Customer` (nombre, moneda, zona horaria).
- **Restricción clave**: disponible solo para MCCs con **más de USD 1.000 de gasto histórico y buen standing**. Desde el 17/3/2025 Google endureció esto: MCCs que no cumplen mínimos reciben `CREATION_DENIED_INELIGIBLE_MCC`, y hay **cuotas** de creación (`RESOURCE_EXHAUSTED` con retry_delay) ([PEMAVOR](https://www.pemavor.com/news/upcoming-changes-to-customerservice-in-google-ads-api/)). Un MCC nuevo de LOCA **no puede crear cuentas el día 1**.
- Las cuentas creadas por API nacen **sin método de pago**: la configuración de tarjeta es manual en la UI (la API no lo permite).

**Opción B — Vincular cuenta existente del cliente** ([doc](https://developers.google.com/google-ads/api/docs/account-management/linking-manager-accounts)): el MCC crea un `CustomerClientLink` en estado PENDING (invitación) y el cliente la acepta (UI o vía API autenticado como el cliente). 100% automatizable con OAuth del cliente.

**Pros/contras para un SaaS done-for-you:**

| | Crear bajo MCC (A) | Vincular existente (B) |
|---|---|---|
| Fricción onboarding | Mínima (cliente solo pone tarjeta) | Media (cliente debe tener/aceptar cuenta) |
| Historial/QS | Cuenta nueva, sin historial, mayor riesgo de suspensión automática | Hereda historial y verificación |
| Control | Total para LOCA | El cliente puede tocar/romper cosas |
| Riesgo de cascada | Alto (cuentas "hijas" del MCC) | Menor (cuenta del cliente) |
| Portabilidad para el cliente | Depende; debe dársele acceso | Total |

**Recomendación**: híbrido — crear bajo MCC para clientes sin cuenta (la mayoría del target), vincular cuando ya existe. En ambos casos dar al cliente acceso admin y su customer ID (obligación de transparencia).

## 3. Billing

**Lo que la API permite y no permite** ([doc de billing](https://developers.google.com/google-ads/api/docs/billing/overview)):
- `BillingSetup`, `AccountBudgetProposal` e `Invoice` **solo funcionan con facturación mensual (monthly invoicing / línea de crédito)**. Requisito duro.
- **No se puede configurar una tarjeta de crédito vía API.** El alta de medio de pago es manual en la UI. Es la mayor fricción del onboarding "sin que el cliente toque nada".

**Monthly invoicing (línea de crédito)** ([Google Ads Help](https://support.google.com/google-ads/answer/2375377?hl=en)): requiere empresa registrada ≥1 año, cuenta activa ≥6 meses, y gasto mínimo de ~USD 5.000/mes (varía por país) en 3 de los últimos 12 meses; la cuenta debe estar bajo un manager. Se paga a mes vencido por transferencia. **LOCA no califica hoy, pero es la meta a 6-12 meses**: con invoicing, "cobro anticipado por Stripe → pago a Google a 30 días" se vuelve limpio, con flujo de caja positivo, y el billing es 100% automatizable vía API.

**¿Puede LOCA poner SU perfil de pagos y revender pauta?** Sí, es práctica común de agencias y no está prohibido, **pero** dispara las [obligaciones de transparencia de terceros](https://support.google.com/adspolicy/answer/16489093?hl=en) y la [política de third parties](https://support.google.com/adspolicy/answer/6086450):
- Reportar al cliente el **costo exacto cobrado por Google**, separado de los fees de LOCA (no se puede esconder markup sobre la pauta).
- Informar el management fee **por escrito antes de la primera compra** y en todas las facturas.
- Si el contrato incluye reporte mensual: costos, clics e impresiones a nivel cuenta.
- **Directamente aplicable a LOCA**: si ≥80% de los clientes gastan <USD 1.000/mes, es **obligatorio** compartir la guía "Working with third parties" de Google con todos los clientes (link prominente en la web y en ventas/renovaciones), y entregar el customer ID a quien lo pida.
- Riesgo financiero: saldos impagos de clientes quedan a nombre de LOCA; hay casos de suspensión de múltiples cuentas de un MCC por deudas ([Google Ads Community](https://support.google.com/google-ads/thread/248883082/several-accounts-were-suspended-due-to-unpaid-balances-inside-my-mcc?hl=en)). El cobro anticipado vía Stripe mitiga esto.

**Argentina — impuestos y medios de pago** ([Google Ads Help - impuestos](https://support.google.com/google-ads/answer/2375370?hl=es-419), [Anunzi](https://ayuda.anunzi.net/paid-media/impuestos/impuestos-en-google-ads-argentina), [Contablix](https://contablix.ar/blog/iva-meta-ganancias-2025-retencion-argentina)):
- Google factura localmente vía **Google Argentina SRL**, en ARS, con factura legal entre el día 3 y 5 de cada mes. Con CUIT de Responsable Inscripto → **Factura A con IVA discriminado (21%, computable como crédito fiscal)**; con DNI → Factura B.
- Desde el 1/4/2025 Google Argentina aplica **percepciones de IIBB** (según jurisdicción y padrones; cargar CM01/CM02/CM05). Para RI sin exclusión, percepción de IVA adicional del 3%.
- Para consumidores finales / pagos con tarjeta en USD el paquete de impuestos puede superar el 50%, pero **para una empresa RI facturada localmente el costo real extra es mucho menor** (IVA recuperable). Si LOCA revende pauta, LOCA (RI) absorbe y recupera el IVA y le simplifica la vida fiscal a la pyme — argumento de venta real, pero exige contabilidad prolija de percepciones por provincia. **No confirmado**: disponibilidad formal de monthly invoicing contratando con Google Argentina SRL — validar con un rep de Google.

## 4. Riesgos

- **Cascada por suspensión del MCC**: las suspensiones pueden extenderse a cuentas vinculadas. Peor: **el developer token vive en un MCC** — si ese MCC cae, cae la API para TODOS los clientes ([políticas API](https://support.google.com/adspolicy/answer/6169371?hl=en)). Mitigación estándar: **separar el MCC del developer token (sin pauta, sin riesgo) del/los MCC operativos**, y no concentrar todo en un solo árbol.
- **"Circumventing systems" en cuentas nuevas**: crear muchas cuentas nuevas bajo un MCC dispara suspensiones automáticas; patrón documentado ([caso en Google Ads Community](https://support.google.com/google-ads/thread/214696193/new-account-under-mcc-got-suspended-by-default-for-circumventing-systems-policy?hl=en) — se reactivó con apelación en ~24h, pero es fricción recurrente). Nunca recrear una cuenta suspendida en otra cuenta: eso sí es circumventing y quema el MCC.
- **Advertiser identity verification**: Google puede exigir verificación de identidad del **anunciante (el cliente)**. Si LOCA paga las campañas, LOCA también se verifica e indica que opera en nombre de clientes ([Google Ads Help](https://support.google.com/adspolicy/answer/16489093), [D&V360 help](https://support.google.com/displayvideo/answer/12766287?hl=en)). Existe [`IdentityVerificationService` en la API](https://developers.google.com/google-ads/api/docs/account-management/advertiser-identity-verification): permite consultar estado/deadline y generar la URL de verificación para el cliente (automatizable en el onboarding de Eva). **Si vence el plazo sin verificar, la cuenta se pausa.**
- **Enabling policy violations**: la política de terceros sanciona el "patrón sostenido" de violaciones habilitadas por el partner. Si Eva genera anuncios/landings que violan políticas a escala, el riesgo es sistémico → validador de políticas pre-publicación en el pipeline.
- **Realidad de mercado**: recuperaciones lentas y sin SLA; soporte débil para cuentas chicas. El seguro real: buen historial de pago, landings con datos de contacto reales, verificación temprana, crecimiento gradual del MCC.

## 5. Optimización automática

- **Reporting**: `GoogleAdsService.SearchStream` (GAQL) da todas las métricas por campaña/ad group/keyword/asset.
- **Recomendaciones**: [`RecommendationService`](https://developers.google.com/google-ads/api/docs/recommendations) expone las recomendaciones de Google y `ApplyRecommendation` las aplica. **No existe "auto-apply" nativo vía API**, pero el patrón [Detect-and-Apply](https://developers.google.com/google-ads/api/samples/detect-and-apply-recommendations) (poll periódico + aplicar según reglas propias) lo replica — y es mejor: LOCA decide cuáles aplicar (las de Google a veces suben gasto sin retorno).
- **Google Ads Scripts**: JavaScript en la UI con límites de ejecución; para LOCA la API + cron propios es la arquitectura correcta.
- **Competidores** ([Optmyzr vs Opteo](https://www.optmyzr.com/compare/optmyzr-vs-opteo/), [comparativas 2026](https://www.hyperfx.ai/blog/best-google-ads-automation-tools-2026)): reglas de pujas/presupuestos, pacing mensual, n-grams para negativas, pausado de bajo rendimiento, alertas, audits. Ninguno es "done-for-you" real: todos requieren humano que configure y apruebe. **El diferencial de LOCA es genuino**; la contracara es que LOCA asume la responsabilidad total del resultado.
- **Google Partner** ([requisitos](https://thriveagency.com/news/googles-revamped-partner-program-requirements-and-best-practices/)): optimization score ≥70% en el MCC, USD 10.000 de pauta en 90 días, 50% de estrategas certificados. Alcanzable en el piloto. Beneficios: badge, soporte, betas.

## 6. Recomendación final para LOCA

**Arquitectura:**
1. **Tres piezas**: MCC "API" (developer token, nunca pauta) → MCC operativo LOCA → cuentas cliente. Cliente siempre con acceso admin y customer ID visible en la app.
2. **Onboarding**: sin cuenta → LOCA la crea vía `CreateCustomerClient` (cuando el MCC califique; al inicio, creación manual asistida); con cuenta → invitación `CustomerClientLink` + OAuth. Verificación de identidad disparada desde el día 1 vía `IdentityVerificationService`.
3. **Billing en dos fases**:
   - **Fase 2a (MVP)**: tarjeta del cliente en su propia cuenta (único paso manual, guiado por Eva). LOCA cobra solo su fee por Stripe. Cero riesgo fiscal/financiero, y el cliente RI recibe Factura A de Google Argentina directo.
   - **Fase 2b (6-12 meses)**: con historial y ~USD 5.000/mes de pauta agregada, solicitar **monthly invoicing** → perfil de pagos LOCA en todas las cuentas, cobro anticipado por Stripe (pauta + fee desglosados), pago a Google a 30 días. Recién ahí el onboarding es realmente "el cliente no toca nada".
4. **Motor de optimización**: cron diario — reporting GAQL → reglas propias (pacing, pausado, negativas) + Detect-and-Apply selectivo → registro de cada cambio para mostrárselo al cliente ("qué hice esta semana y por qué").

**Presupuesto mínimo viable (AR):** CPCs argentinos bajos en USD (~0,1-0,5 en rubros locales). Regla: presupuesto diario ≥ 3× CPA objetivo; benchmarks LATAM: [USD 150-500/mes para una pyme](https://spicytool.net/en/blog/google-ads-pequenas-empresas-2025/). Práctico: **piso USD 200-300/mes para Search local**; **PMax no debajo de ~USD 10-15/día (USD 300-450/mes)**. Default del producto: Search base para todos + PMax como upgrade.

**Pricing por volumen**: fee base incluye pauta hasta USD 500/mes; escalones (+USD 40 hasta 1.500, % decreciente arriba) — siempre fee separado del costo Google en la factura.

**Acciones inmediatas:** (1) crear el MCC y solicitar **Basic Access ya** (backlog + caso de uso detallado); (2) construir contra cuentas test / Explorer mientras tanto; (3) descartar Smart Campaigns; (4) validar con rep de Google el monthly invoicing con Google Argentina SRL (**no confirmado**); (5) checklist de transparencia de terceros (guía de Google en la web, fee en facturas, costos exactos en reportes).

**No confirmado / a validar**: clasificación RMF exacta de LOCA (full-service vs interno); monthly invoicing con entidad argentina; cuotas exactas de `CreateCustomerClient`.
