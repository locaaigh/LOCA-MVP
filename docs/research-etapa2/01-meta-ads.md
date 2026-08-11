# Investigación FASE 2: Meta Ads 100% automático para LOCA

> Research profundo, ago 2026. Resumen accionable en `PLAN-etapa2.md` §1.

## 1. Marketing API: ¿se puede gestionar todo programáticamente?

**Sí, la cobertura es completa.** La Marketing API permite crear y gestionar campañas, ad sets, ads, creatividades (imagen/video/carousel), públicos (custom, lookalike, saved audiences), presupuestos (CBO/ABO), pausar/activar/ajustar cualquier objeto, y leer métricas. No hay nada del flujo publicitario core que requiera tocar Ads Manager a mano.

**Advantage+ vía API — ojo con el timing (dato importante para construir HOY):**
- Meta está unificando todo en una estructura Advantage+ única con tres palancas: Advantage+ budget, audience y placement. Las APIs legacy de Advantage+ Shopping (ASC) y App Campaigns (AAC) quedaron deprecadas: no se pueden crear nuevas desde la API v24.0 y desaparecen en v25.0 (Q1 2026). Hoy una campaña "Advantage+ ON" se crea con el endpoint normal de campañas activando esas palancas ([PPC Land](https://ppc.land/meta-deprecates-legacy-campaign-apis-for-advantage-structure/), [docs Advantage+ Campaigns](https://developers.facebook.com/docs/marketing-api/advantage-campaigns/)).
- Desde v23.0, `advantage_audience` en `targeting_automation` es default/obligatorio de declarar al crear ad sets ([Meta dev blog, jun 2025](https://developers.facebook.com/blog/post/2025/06/13/marketing-api-changes-to-advantage-plus-audience-behaviors/)). Conclusión: construir directamente sobre la estructura nueva, no sobre ASC.

**Niveles de acceso (renombrados; las fuentes mezclan nombres viejos y nuevos):**
- **Development/Limited (default):** rate limits severos por ad account, pensado solo para desarrollo. Sirve para construir y probar con cuentas propias.
- **Full/Standard (antes "Advanced"):** se solicita desde el dashboard cuando la app hizo ≥500 llamadas a la Marketing API en 15 días con error rate <15%. Rate limits altos, Business Manager API y Catálogo completos, 10 system users ([docs de autorización](https://developers.facebook.com/docs/marketing-api/overview/authorization/), [update oficial del tier](https://developers.meta.com/blog/updates-to-ads-management-standard-access-feature/)).

**App Review para `ads_management` (Advanced Access) — el gate real:**
- Con acceso estándar solo gestionás cuentas de tu propio negocio. Para gestionar cuentas de terceros (clientes) necesitás Advanced Access a `ads_management`/`ads_read`, que exige App Review + Business Verification del BM dueño de la app (INFINIDAD ya la tiene ✓).
- El review pide screencast del flujo completo: login → pantalla de consentimiento OAuth mostrando el permiso → onboarding de la cuenta del cliente → la feature usándolo. Rechazos típicos: saltear el login, no mostrar el consent screen, video que no coincide con el use case declarado. Tarda ~3–7 días hábiles ([guía App Review 2026](https://singhamandeep.com/facebook-ads-api-permission-app-review/), [guía screencast](https://singhamandeep.com/meta-app-review-screencast-why-your-demo-video-gets-rejected-2026/)). LOCA ya pasó por esto con el publishing orgánico, así que el proceso es conocido.

**Rate limits:** modelo BUC (Business Use Case) por ad account/hora: `(100.000 en tier standard | 300 en dev) + 40 × ads activos`. Lecturas = 1 punto, escrituras = 3 ([docs rate limiting](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/)). Para el volumen de LOCA (decenas–cientos de pymes, pocas campañas c/u) esto no es un cuello de botella ni en dev tier al principio.

**Meta Business Partners:** es un programa de badge/certificación, **no un requisito para operar la API**. Para ad tech partners exige spend material vía API, integración profunda, case studies y negocio verificado; da directorio, soporte dedicado, betas y (clave) un canal humano ante restricciones. No tiene umbrales públicos y el badge se puede perder ([políticas del programa](https://www.facebook.com/business/marketing-partners/become-a-partner/fmp-product-policies), [guía 2026](https://www.replyrush.com/post/what-is-meta-business-partner)). Es objetivo de Fase 3, no de arranque.

## 2. Los dos modelos de cuenta publicitaria

### a) Cliente conecta SU cuenta (OAuth + ads_management)

Es el modelo de Madgicx/Revealbot/AdEspresso y de la mayoría del SaaS.

**Pros:** cero exposición financiera de LOCA (el cliente paga a Meta directo con su tarjeta); el riesgo de policy queda aislado en la cuenta del cliente (si lo banean, no arrastra a LOCA); no requiere línea de crédito ni partner status; App Review estándar; el cliente conserva su historial/pixel/aprendizaje si se va.

**Contras:** fricción brutal de onboarding para el público de LOCA (pyme que jamás abrió Ads Manager): crear cuenta, cargar método de pago, entender la facturación. Y en Argentina el cliente que paga con tarjeta local sufre ~51% de impuestos (ver §4). Además cuentas nuevas sin historial tienen límites de gasto diarios bajos y más chequeos automáticos al inicio.

**Si el cliente no tiene cuenta ni método de pago:** no se le puede crear la cuenta por API (eso requiere el modelo b con LOC). Todo usuario de Facebook tiene una cuenta publicitaria personal latente, pero sin método de pago válido Meta no publica nada ([Meta help](https://es-la.facebook.com/business/help/401428293333537)). El mejor mitigante es un wizard guiado dentro de LOCA (deep links a la creación de cuenta + carga de pago) — sigue siendo el paso donde más clientes se van a caer.

### b) LOCA crea las cuentas desde su propio BM

**Creación programática de ad accounts: existe pero está gateada.** Según la [documentación oficial de Business Management APIs](https://developers.facebook.com/docs/business-management-apis/business-manager/get-started/), el endpoint de creación de cuentas (`/{business-id}/adaccount`) está limitado a **partners de la Marketing API con facturación habilitada**: exige una **línea de crédito (LOC) normal propiedad del Business Manager**, permiso `business_management` con acceso avanzado, y coordinación con un sales rep de Meta. Solo soporta "normal liability" (LOCA responde por el 100% del gasto; la responsabilidad secuencial, donde el anunciante final responde, no está soportada por esa vía). **Conclusión honesta: la creación programática NO está disponible para LOCA hoy** — es de Fase 3, tras conseguir LOC y probablemente partner status.

**Alternativa práctica y 100% válida (Fase 2 real):** crear las ad accounts **manualmente en el BM** (no por API) y gestionarlas después enteramente por API. Límites: un BM nuevo arranca con 1–5 ad accounts; crece con historial de gasto y pago (hasta 10, 25 o más; gastar >$10k/mes de forma consistente y estar verificado acelera el aumento, que se pide vía soporte o sube solo) ([Jon Loomer](https://www.jonloomer.com/glossary/ad-account-creation-limit/), [Clikim](https://clikim.com/how-many-facebook-ad-accounts-can-i-have/)). Para el piloto (5–20 clientes de ads) alcanza; para cientos de clientes hay que escalonar BMs o llegar a LOC.

**El modelo "agency ad account" es el estándar recomendado por Meta:** la agencia crea y es dueña del ad account en su BM; el cliente es dueño de su Página (y pixel/catálogo) y le da **partner access** a la agencia; el ad account corre ads "en nombre de" esa Página. Es exactamente la estructura de best practices de Meta para agencias ([Stackmatix](https://www.stackmatix.com/blog/facebook-ads-agency-account), [iDimension](https://www.idimension.com/2021/01/should-client-or-agency-own-an-ad-account/)). LOCA ya tiene el asset-linking de páginas resuelto por la integración orgánica.

## 3. Riesgos del modelo BM propio

**El efecto cascada es real y está bien documentado:**
- Una restricción de BM afecta a **todos** los ad accounts, usuarios y assets del portfolio. Peor: un BM deshabilitado queda congelado — no se pueden editar settings, sacar Páginas ni migrar assets a otro BM; las Páginas atrapadas adentro no pueden volver a pautar ([Whizz Experts](https://whizz-experts.com/support/account-access-help/facebook-business-manager-restricted-multiple-ad-accounts-fix/), [Goodchild](https://jetskishaman.com/facebook-business-manager-restricted-facebook-disabled-facebook-ad-account/)).
- Meta además marca payment methods, dominios, IPs y emails asociados a un violador como "untrusted", contaminando cuentas futuras ([Daily Intel](https://dailyintelservice.com/blog/account-intelligence/facebook-circumventing-systems-policy)). Hay casos reportados de agencias verticales (ej. clientes dentales) con el BM entero dado de baja por rechazos acumulados de una categoría.
- **Responsabilidad por el gasto:** con normal liability, LOCA paga la factura de Meta aunque el cliente no le pague a LOCA.

**Policy — qué está permitido y qué no:**
- Correr pauta para clientes desde ad accounts propios de agencia = **modelo de agencia clásico, permitido y recomendado**.
- Lo prohibido es **vender/alquilar/prestar acceso a cuentas** (el gray market de "agency accounts" con gasto ilimitado) y cualquier táctica de evasión de enforcement ("circumventing systems", categoría high-risk) ([Transparency Center](https://transparency.meta.com/policies/ad-standards/), [StubGroup](https://stubgroup.com/blog/meta-circumventing-systems-suspension-what-it-means-and-how-to-address-it/)). La línea: LOCA debe operar como agencia que gestiona la pauta, no como revendedora de "acceso a cuentas". El cliente valida, LOCA ejecuta — eso es agencia.

**Cómo lo mitigan las agencias grandes (y qué debería hacer LOCA):**
1. **Separar BMs**: nunca poner las ad accounts de clientes en el BM que aloja la app de Meta y la integración orgánica. Un BM "LOCA Media" (verificado) para pauta, el BM principal de INFINIDAD intocable. A escala: varios BMs por cohortes de clientes.
2. **Un ad account por cliente, siempre** (aislamiento de violaciones y de facturación).
3. **Moderación previa de creatividades**: acá LOCA tiene una ventaja estructural única — **LOCA genera el contenido**, así que puede garantizar compliance con Ad Standards antes de publicar (algo que ninguna agencia con clientes que suben sus propios ads puede). Sumar un check automático de categorías prohibidas/restringidas (cripto, salud, empleo, vivienda, política) en el onboarding.
4. **No aceptar verticales de alto riesgo** en el plan de ads al inicio.
5. **Higiene**: 2FA en todos los admins, system users para la API, dominios verificados, no cambiar admins+billing al mismo tiempo (patrón que dispara revisiones).
6. **Partner status** como objetivo: el beneficio más valioso no es el badge sino el canal de soporte humano cuando algo se restringe.

## 4. Facturación y cobro anticipado

**¿Puede LOCA cobrar la pauta por adelantado con markup y pagar a Meta después? Sí.** Es el modelo de media buying de agencias de toda la vida; en su versión moderna se llama *principal media buying* (la agencia compra por cuenta propia y revende con markup, que va del 10% a mucho más). No hay política de Meta que lo prohíba — lo que Meta regula es quién es responsable del pago (liability) y que no se revendan *cuentas*. El riesgo del modelo es contractual/de transparencia con el cliente, no de plataforma: conviene divulgar el fee/markup en los T&C para evitar el conflicto clásico del principal buying ([AdExchanger](https://www.adexchanger.com/data-driven-thinking/how-to-keep-agencies-honest-on-principal-media-deals-and-avoid-unaccountable-arbitrage/), [Progmatic](https://progmatic.media/en/risks-and-remedies-for-principal-media-buying/)). Precedente directo del modelo LOCA: **Hibu** corre Facebook/Instagram ads done-for-you para miles de SMBs vía la plataforma white-label de Tiger Pistol, y Vendasta hace lo mismo con AdPilot ([Tiger Pistol](https://tigerpistol.com/facebook-instagram-ads-smbs-automation-resellers/)).

**Línea de crédito / monthly invoicing de Meta:** Net 30, crédito asignado según historial. No hay umbral oficial publicado; la comunidad reporta ~USD 50k/mes de gasto como corte típico ([Meta Business Help](https://www.facebook.com/business/help/183197756325469), [AdsUploader](https://adsuploader.com/blog/meta-ads-monthly-invoicing)). Dato nuevo 2026: desde el **1 de abril de 2026** Meta dejó de aceptar tarjetas en cuentas de alto gasto (~$50k+/mes) y las forzó a invoicing o débito directo ([Rockads](https://blog.rockads.com/meta-ads-billing-changes-2026-the-complete-guide-to-credit-card-removal-payment-setup-and-what-advertisers-must-do/), [AuditSocials](https://www.auditsocials.com/blog/meta-ends-credit-card-payments-high-spend-ad-accounts-monthly-invoicing-2026)). Para LOCA esto es neutro al inicio (cuentas chicas) y de hecho marca el camino: cuando el gasto agregado llegue a esa zona, el invoicing deja de ser opcional.

**Argentina — situación impositiva 2026:**
- **Impuesto PAÍS: eliminado** desde el 23/12/2024 (no fue prorrogado) ([Chequeado](https://chequeado.com/el-explicador/fin-del-impuesto-pais-que-impacto-tendra-en-las-compras-de-bienes-y-servicios-en-el-exterior-en-el-turismo-y-en-las-importaciones/)).
- Lo que queda al pagar Meta (facturado desde Meta Ireland) con tarjeta argentina: **IVA 21%** (servicios digitales del exterior, RG 4240) + **percepción 30%** (RG 5617/24, a cuenta de Ganancias/Bienes Personales — recuperable en la declaración anual, pero inmoviliza caja ~1 año) ≈ **+51% sobre la pauta** ([Contablix](https://contablix.ar/blog/iva-meta-ganancias-2025-retencion-argentina), [DoubleTick](https://www.doubletick.com.ar/como-financiar-pauta-meta-ads-argentina/)).
- Existen **cuentas en ARS con saldo prepago**: Mercado Pago, Rapipago, Pago Fácil ([HOOD](https://www.int.com.ar/novedades/meta-ads/paga-meta-ads-con-mercado-pago/), [Posicionarte](https://posicionarteeninternet.com/pei/formas-de-pago-en-meta-ads-argentina-como-pagar-tus-anuncios-en-facebook-e-instagram-en-2025-26/)). Desde feb-2023 una cuenta configurada en Argentina no acepta tarjetas emitidas fuera del país.
- Pagar USD→USD (cuenta configurada fuera de AR, tarjeta en USD) evita la percepción del 30% ([Takenos](https://takenos.com/blog/como-pagar-meta-ads-desde-argentina)).
- **Implicancia para LOCA:** el modelo más limpio es el que ya usa para suscripciones — **la LLC de EE.UU. es la entidad del BM de medios, las ad accounts se configuran con domicilio de la LLC, Meta le factura a la LLC sin impuestos argentinos, y LOCA le cobra al cliente pauta + fee en USD vía Stripe**. Esto le ahorra al cliente el ciclo de percepciones (el costo financiero del 30% desaparece) y le da a LOCA el margen del markup. Caveat honesto: el tratamiento impositivo del cliente argentino que importa un servicio de la LLC (IVA por importación de servicios, percepciones sobre el pago con tarjeta al exterior según cómo pague la suscripción) depende de su situación fiscal — **validar con contador antes de prometerle al cliente "sin impuestos"**. Alternativa que no se pudo confirmar: Aleph (HQ en Buenos Aires) es Authorized Sales Partner de Meta con facturación local en varios mercados, pero no hay evidencia de que opere como ASP para Argentina (Meta vende directo ahí).

**Riesgos financieros del modelo prepago y cómo cerrarlos:**
- **Prepago estricto tipo wallet**: el cliente carga saldo antes de que corra un solo ad. Nunca financiar pauta a crédito del cliente.
- **Spending limit nativo de Meta por ad account** igual al saldo prepago del cliente: Meta corta solo, imposible pasarse del tope. Esta feature elimina casi todo el riesgo de "gasto que se escapa".
- **Chargebacks de Stripe**: el riesgo real del modelo (cliente disputa el cargo después de que la pauta corrió). Mitigar con T&C explícitos, cargos descriptivos, evidencia de servicio (reportes), y no acumular saldos grandes de clientes nuevos.
- **Descalce cambiario**: cobrar en USD y pagar a Meta en USD lo elimina de raíz — otra razón para la vía LLC.

## 5. Loop de aprendizaje y optimización automática

**Insights API:** métricas completas a nivel campaign/ad set/ad (spend, impressions, CTR, CPC, CPM, conversiones, ROAS por ventana de atribución), con breakdowns (edad, género, placement, hora) y jobs asíncronos para reportes grandes. Es la base del loop y del dashboard de métricas que LOCA ya tiene para orgánico.

**Automated Rules vía API — existe y es exactamente lo que LOCA necesita:** el [Ad Rules Engine](https://developers.facebook.com/docs/marketing-api/ad-rules) permite crear reglas como objetos (`act_XXX/adrules_library`) de dos tipos: **schedule-based** (se evalúan a intervalos) y **trigger-based** (se disparan cuando cambian los insights), con acciones de pausar, notificar, ajustar presupuesto/bid, y webhooks para notificación casi en tiempo real. Alternativa: LOCA puede implementar su propio motor de reglas leyendo Insights con un cron — más control, y le permite meter a Eva/LLM en el loop de decisión (algo que Meta rules no puede).

**Qué hacen las herramientas comparables:**
- **Revealbot** ($99/mes hasta ~$10k de spend, escala con el gasto; $299 unlimited): motor de reglas condición→acción muy expresivo (ROAS bajo umbral → pausar; CPA ok + spend mínimo → escalar +20%), triggers temporales, métricas custom ([AdLibrary](https://adlibrary.com/posts/revealbot-review-2026)).
- **Madgicx** (desde ~$49–99/mes, tiers por features): reasignación autónoma de presupuesto por ML (ABO), audience launcher, creative insights ([comparativa de pricing](https://adlibrary.com/guides/meta-ads-automation-software-pricing-9-options-compared)).
- **AdEspresso**: históricamente el "ads fáciles para SMB" (creación simplificada + A/B testing), referencia de UX más que de tecnología actual.
- **Done-for-you real para SMBs**: LocaliQ (Gannett) es gestión humana quote-only que arranca en miles de USD/mes — o sea, no llega al segmento de LOCA ([Feedbird vs LocaliQ](https://feedbird.com/compare/localiq/)). **Hibu/Tiger Pistol y Vendasta AdPilot** son la prueba de que el modelo "plataforma automatizada + cuentas gestionadas para miles de SMBs" funciona a escala vía API. El hueco de mercado de LOCA (done-for-you por <$200/mes de fee, en español, para pymes LATAM) está genuinamente vacío.

**Estrategia de optimización recomendada (honesta):** con Advantage+ haciendo budget/audience/placement por ML, el valor de un optimizador propio ya no está en microgestionar bids sino en: (1) **kill rules** con piso de gasto (no matar ads antes de ~$20–30 gastados o salir del learning phase), (2) **refresh creativo** cuando la frequency sube y el CTR cae — acá LOCA es imbatible porque genera creatividades nuevas con IA a costo marginal cero, (3) **reasignar presupuesto entre campañas/objetivos** semana a semana, y (4) explicar los resultados al cliente en lenguaje humano (Eva). El loop: Insights diario → reglas de protección → decisión semanal de Eva (presupuesto + creatividades nuevas) → validación opcional del cliente.

## 6. Recomendación final para LOCA

**Arquitectura por fases:**

- **Fase A (piloto, 1–2 meses de dev):** modelo (a) — OAuth con `ads_management` (App Review con screencast del onboarding; INFINIDAD verificada ya cumple el prerequisito). El cliente usa su cuenta y su método de pago; LOCA cobra solo fee de gestión sobre la suscripción. Wizard guiado para clientes sin cuenta. Cero riesgo financiero, valida el producto. Construir sobre estructura Advantage+ (v24+), nunca sobre ASC legacy.
- **Fase B (el diferencial):** BM de medios **separado** ("LOCA Media LLC", verificado, distinto del BM que aloja la app), ad accounts creadas manualmente (límite crece con historial), una por cliente, Página del cliente vía partner access (ya resuelto por la integración orgánica), pago a Meta con tarjeta de la LLC, **cobro prepago en USD vía Stripe con spending limit nativo = saldo del cliente**. Esto elimina la fricción de onboarding Y el problema impositivo argentino del cliente. Moderación automática de creatividades pre-publicación.
- **Fase C (escala):** aplicar a Meta Business Partners, negociar línea de crédito/monthly invoicing cuando el spend agregado se acerque a ~USD 50k/mes, y recién ahí desbloquear la creación programática de ad accounts. Escalonar en múltiples BMs por cohortes.

**Presupuesto mínimo viable de pauta:** USD 300/mes (~$10/día) como piso recomendado para objetivos de tráfico/leads locales; USD 150–200/mes solo para awareness. Para conversiones con optimización real, sugerir USD 500+/mes (el learning phase necesita ~50 conversiones/semana por ad set).

**Pricing sugerido** (benchmark de agencias: 10–20% del spend o retainer $1.000–2.500/mes — [Superscale](https://superscale.ai/learn/meta-ads-management-cost/), [Linear](https://lineardesign.com/blog/facebook-ads-management-pricing-guide/) — que LOCA puede reventar por abajo):
- **Ads Starter**: +USD 49/mes sobre la suscripción, pauta hasta USD 500/mes.
- **Ads Growth**: +USD 99/mes hasta USD 1.500 de pauta.
- **Ads Scale**: 10% del spend (mínimo USD 149) arriba de eso.
- En Fase B, margen adicional implícito de 5–10% por el servicio financiero de la pauta prepaga (divulgado en T&C).

**Lo que NO se pudo confirmar:** umbral exacto de la LOC de Meta (los ~$50k/mes son community-reported); si Aleph opera como Authorized Sales Partner en Argentina; el tratamiento impositivo exacto del cliente argentino pagando pauta a la LLC (requiere contador); y los umbrales internos del programa Meta Business Partners (no son públicos y cambian).

**Los dos riesgos que más importan:** (1) el efecto cascada de un BM restringido — se mitiga con BM de medios separado + moderación de creatividades + no aceptar verticales de riesgo, y es un riesgo que LOCA controla mejor que una agencia normal porque genera todo el contenido; (2) confundir el modelo agencia legítimo con "alquiler de cuentas" — mientras LOCA gestione la pauta como servicio (y no venda acceso a cuentas), está dentro de policy.
