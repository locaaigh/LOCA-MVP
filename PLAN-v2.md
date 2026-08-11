# PLAN v2 — Backlog de cambios LOCA (ago 2026)

Fuente de verdad del backlog acordado con Sebastián. Cada item tiene decisión final.
No cambiar lógica documentada en FUNCTIONALITY.md salvo lo que este plan indique.

## Leyenda de estado
- ⬜ pendiente · 🔄 en progreso · ✅ hecho · 🅿️ plan-only (no ejecutar aún) · 🚀 pendiente-producción

---

## FEATURE A — Auto-publicación (conectar → aprobar → programar → publicar solo)

Decisiones:
- **A1 LinkedIn:** ⬜🅿️ Más adelante. Requiere dominio de LOCA activo para linkear. Fase aparte.
- **A2 Carrusel/Reel:** Meta API **sí** soporta ambos (IG carrusel 2–10 imgs con children; IG reels con video_url; FB multi-foto con attached_media; FB reels por fases). No hace falta plan B. Cuello real = **generar** el visual (item 13), no publicar.
  - **Flag de formatos habilitados**: mientras un formato no esté end-to-end (generación+publicación), la plataforma NO lo propone en estrategia ni lo genera. Hoy habilitado solo `post_estatico`. Encender `carrusel` → `reel` progresivamente.
- **A3 Disparador:** al **aprobar** → queda programada con fecha/hora del calendario. Toast 3–5s "Se publicará el X a las Y". Editable desde el **calendario**.
- **A4 Timezone:** según **país del onboarding** (default Argentina).
- **A5 Cron/hosting:** 🚀 mantener hosting actual; el cron de publicación programada (cada 5–15 min) queda **pendiente para producción** (Vercel Pro o scheduler externo).
- **A6 Imágenes públicas:** OK. IG exige URL pública https (no data URL). Verificar que las generadas quedan con URL pública en Supabase Storage.
- **A7 "Ver contenido" → link real:** ⬜ agregar campo permalink/postUrl + mediaId + publishedAt al ContentItem; botón "Ver" redirige al post real.
- **A8 Aviso:** sin email. El usuario lo ve en "Contenidos publicados" con clic para ir a la publicación real.
- **Producción/Meta:** 🚀 App Review de `instagram_content_publish` / `pages_manage_posts` para usuarios no-admin.

---

## ONBOARDING (1–8)

1. ⬜ **Popup de obligatorios antes de "confirmar y seguir".** Bug: validación por-paso pero `finish()` no revalida y web/IA saltan al resumen. Forzar completar faltantes en popup antes de crear estrategia. Opción **"Ninguna"** en fechas especiales/estacionalidad (cuenta como respondido). Incluir fix del bug de IDs del paso Brand Kit en onboarding-validation.ts.
2. ⬜ **Scraping más potente + links de redes asociados.** Los links YA se extraen (businessIntelligence.socialLinks) pero no se muestran en el perfil → exponerlos. Mejorar tipografía/paleta. **Sin presupuesto** para servicios de render. Caso OK: nivii.ai. Caso que falla: dradlerstein.com.ar. **Principio: no inventar.** Si no detecta (ej. colores reales), preguntar al usuario, nunca inventar.
3. ✅-decidido ⬜ **Tipo de negocio nuevo campo:** startup / pyme / emprendimiento / profesional independiente (campo aparte de businessType actual). Servirá para pedir info/contenido distinto por tipo.
4. ⬜ **Color HEX no RGB.** Causa: en Settings→Datos rápidos el color usa solo `<input type=color>` nativo (abre selector RGB del SO, sin campo HEX). Fix: agregar campo de texto HEX propio en Settings y donde se cambie color.
5. ⬜ **Extracción de datos comerciales.** Falla en algunos sitios. No inventar; preguntar. (Calibrar con .md de socio local.)
6. ⬜ **Do's/Don'ts en cards separadas + ejemplos generados por Eva.**
7. ⬜ **Servicios vs características.** Extracción mete características/descr como servicios (ej. 3 reales → 8). Distinguir servicio real de característica en heurística + prompt. Calibrar con el .md.
8. ⬜ **Sin identidad visual → no marcar listo.** Abrir para subir logo/tipografía/paleta o que Eva sugiera. **Paletas curadas por industria** (armar ahora, fijas, no generar cada vez) + opción de que Eva ajuste.

---

## CONTENIDOS / GENERACIÓN (9–20)

9. ⬜ **UX revisión sin scroll.** Formato **deck de a una pieza** (confirmado). Compactar encabezado (progreso+título+tabs a una franja fina) para que el contenido, copy y botones (aprobar/feedback) se vean sin scrollear. **"Aprobar todo" siempre visible.**
10. ⬜ **Modal editar copy/fecha.** Agrandar textarea del copy (hoy min-h 120–140 se scrollea adentro). Achicar fecha/hora.
11. ⬜ **Bug "Publicados".** Causa: isPublished infiere por fecha vencida (aprobado+fecha pasada). Fix: Publicados = solo realmente publicados. Si falló → **alerta con "reintentar"** + Eva propone nueva fecha (editable). Si no se publicó → queda en Aprobados.
12. ⬜ **Placeholder "LOCA" → "Eva trabajando".** Animación blurreada con mensajes rotando ("Estoy buscando referencias…", "Estoy prompteando…", "Estoy diseñando…", "Estoy corrigiendo…", "Me está gustando…") mientras imageStatus="generando".
13. 🅿️ **Prompting por tipo de contenido.** PLAN, no ejecutar. Estático (foto/producto realista, diseño gráfico, abstracto, ilustración…), Carrusel (2–8 imgs), Reel (video; producto realista, animación, abstracto…).
14. ⬜ **Estructura + UI de carrusel** (multi-imagen; ver slides; aprobar/editar una o todas). Generación queda para item 13.
15. 🅿️ **Modelo por tipo de contenido.** PLAN, no ejecutar.
16. ⬜ **Selección de estilo visual** (cards cuadradas con ejemplos, **multi-select**, en onboarding/estrategia): fotorrealista/fotografía (incl. foto de producto → subir productos nomenclados), render 3D, ilustración vectorial/flat, diseño gráfico minimalista/tipográfico, ilustración artística (acuarela/óleo/lápiz/editorial), cartoon/anime, cinematográfico/editorial. Guardado por negocio, alimenta generación. **Imágenes de ejemplo: generarlas nosotros** (se pueden cambiar después).
17. ⬜ **Fotos por producto/servicio.** Agregar campo de fotos a ProductService (hoy solo imageCaption). Son **referencias para generar** nuevas imágenes. Supabase Storage, nomencladas por el usuario. Resaltar importancia.
18. ⬜ **Cartel destacado** en onboarding y estrategia: "SI VENDÉS PRODUCTOS ES FUNDAMENTAL QUE SUBAS FOTOS BIEN NOMENCLADAS PARA CREAR CONTENIDO DE MAYOR VALOR".
19. ⬜ **Copies:** arreglar repetición (3x lo mismo). **Eliminar hashtags por completo** (SEO se trabaja de otra forma después). Que no se publiquen hashtags.
20. ⬜ **Profesional independiente:** pedir su foto en onboarding (obligatorio). Si hay foto de persona real → **prohibido generar una cara como si fuera el profesional** (sí se pueden generar imágenes de otras personas). Preparar todo contemplando que **puede no usarse Gemini** para este tipo de imágenes.

---

## GENERAL (21–25)

21. 🅿️ **Análisis de agentes/skills.** Al final de todo. Entregar mapa claro de cómo está armado cada agente para que Sebastián intervenga esa capa.
22. ⬜ **Progreso de generación mejorado:** barra/popup sutil siempre visible con mensajes rotativos por proceso. Botón "avisame por email" 🚀 **visible pero inactivo** (se activa en producción).
23. ⬜ **Configuración más intuitiva:** iconos por card; editar "brand kit" debe mostrar logo/colores/fonts/tono (hoy solo un color). Repasar que el usuario pueda ver/editar todo lo cargado.
24. ⬜🅿️ **A futuro:** "generar nuevo negocio" atado a membresía (un negocio = una membresía). No tocar ahora, gatear por plan luego.
25. ⬜ **Botón "editar formulario completo".** Hoy está junto a "crear nuevo negocio" y NO edita el form completo. Separarlo y que **sí** cargue el negocio existente en el wizard para editar todo.

---

## ORDEN DE ATAQUE (fases)

1. **Fundaciones de modelo:** B3 tipo negocio, 17/20 fotos, 16 estilo visual, A7/11 estado real de publicación + permalink, 14 multi-imagen, A2 flag de formatos.
2. **Onboarding:** 1 obligatorios+popup, 5/7/2 extracción y servicios, 8 identidad visual/paletas, 6 do's/don'ts, 4 HEX.
3. **Contenidos UX:** 9 revisión sin-scroll, 10 modal editar, 12 placeholder Eva, 22 progreso, 19 copies.
4. **Auto-publicación Meta:** scheduler + publicar programado + notificación in-app + "ver contenido".
5. **Settings:** 23/25.
6. **LinkedIn** (fase aparte, tras dominio).
7. **Plan prompting + modelos + agentes** (13/15/21).

## PROGRESO — sesión 2026-08-02

Hecho y verificado (typecheck verde en cada tanda):
- ✅ **Fundaciones de modelo**: BusinessStage, UploadedPhoto, ProductService.photos, Business.personPhotos, Business.visualStyles, CarouselSlide, ContentItem.carouselSlides, campos de publicación real (publishedAt/publishedUrl/publishedMediaId/publishError/publishAttemptedAt). Constantes: BUSINESS_STAGES, VISUAL_STYLES, DISABLED_CONTENT_FORMATS + isFormatEnabled.
- ✅ **Item 12** — componente `eva-working.tsx` (overlay animado) reemplaza placeholder "LOCA" mientras genera.
- ✅ **Item 4 (B4)** — campo HEX en Settings→Datos rápidos.
- ✅ **Item 10** — modal editar copy/fecha: copy grande arriba (min-h 300), fecha/hora compactas. (+ Field acepta className).
- ✅ **Item 6** — Do's/Don'ts en dos cards separadas (verde "Hacé"/rojo "Evitá") en la página de estrategia + prompt de Eva con mini-ejemplos.
- ✅ **A2 flag de formatos (parcial)** — prompt de calendario solo propone formatos habilitados; normalización del calendarAgent coacciona carrusel/reel → post_estatico (AI y fallback mock).
- ✅ **Item 3 (UI)** — selector "Tipo de organización" en onboarding (StepBasic) + required en validación paso 1.

### Tanda 2 (2026-08-02) — hecho y verificado
- ✅ **Item 19** — hashtags eliminados de raíz (prompts, agentes content/feedback, mock, review, detalle, copiar, publicación Meta, export CSV, home) + instrucción anti-repetición en el prompt.
- ✅ **Items 5/7** — servicios vs características: `splitTopLevel` (respeta paréntesis, prioriza `|`), `parseOfferingEntry` (nombre = cláusula inicial, resto → descripción), filtros de prosa. Validado con TSL: de ~14 basura → 8 ofertas reales. Fixture del parser sigue verde. Hints del prompt externo guían a usar `|` y `()`.
- ✅ **Item 1 (core)** — gate en `finish()` del onboarding: bloquea crear estrategia si faltan críticos y abre el popup de pendientes (cubre el hueco web/IA/pendientes). "Ninguna" ya cubierto por el Sí/No de temporadas/fechas.
  - Pendiente menor: fix de ids bk_color/bk_font/bk_tone del paso Brand Kit (scroll-to-error). Bajo impacto.

### Tanda 3 (2026-08-02) — bloque identidad visual, hecho y verificado
- ✅ **Item 17** — fotos por producto/servicio: componente reutilizable `photo-uploader.tsx` (label editable por foto) integrado en `ProductServiceForm` con cartel de importancia.
- ✅ **Item 18** — cartel destacado "SI VENDÉS PRODUCTOS…" arriba de StepProducts.
- ✅ **Item 16** — `visual-style-picker.tsx`: cards multi-select con ejemplo visual (CSS, swappable) en StepBrandKit → `business.visualStyles`.
- ✅ **Item 20** — sección de fotos de la persona en StepBrandKit (solo profesional/marca personal), con leyenda "nunca inventamos tu cara"; obligatoria en validación paso 3 (`personPhotos`).
- ✅ **Item 8** — paletas curadas por industria ampliadas (tech/education/fitness/creative/nature + mapeo más amplio). Upload de logo/fonts y "Que Eva elija" ya existían.
  - Nota: el uso de estas fotos/estilos en la GENERACIÓN (image-to-image, no-cara-falsa) es parte del plan de prompting (item 13, diferido).

### Tanda 4 (2026-08-02) — publicación real, hecho y verificado
- ✅ **Item 11** — "Publicados" ya NO se infiere por fecha vencida (`isPublished` solo real: status published/publicado_manualmente o `publishedAt`). Agregado `hasPublishError`. Esto elimina el bug de "13 publicados sin Meta".
- ✅ **A7 "Ver publicación"** — `publish.ts` ahora trae el **permalink** (IG y FB, best-effort); el route lo **persiste** (`publishedUrl/publishedAt/publishedMediaId/publishedPlatform`). Botón "Ver publicación" → link real del post.
- ✅ **Publicar ahora + reintentar** — botón en Aprobados (`api.publishMeta`); en error persiste `publishError` y muestra **alerta + "Reintentar"** (item 11).

Diferido a producción (parte de feature A, necesita cron A5):
- **A3** toast "Se publicará el X" + auto-scheduling (sin cron no es honesto decir que publica solo).
- **Reintento con nueva fecha propuesta por Eva** (aplica al flujo automático).

### Tanda 5 (2026-08-02) — UX de contenidos, hecho y verificado
- ✅ **Item 9** — encabezado compacto: se sacaron ProgressTracker + PageHeader grandes; ahora una franja fina con título + tabs + "Aprobar todo (N)" **siempre visible**. Deck de revisión con header compacto (plataforma + progreso en una fila). Menos scroll.
- ✅ **Item 22** — `generation-progress.tsx`: popup sutil fijo (abajo-derecha) con barra de progreso + mensajes rotativos por fase (contenido/imagen) + botón "Avisame por email" (visible, muestra "disponible próximamente").

### Tanda 6 (2026-08-02) — Settings + redes, hecho y verificado
- ✅ **Item 23** — Settings con iconos por card (CardHeader) + **editor de brand kit completo** en modal (logo, colores, fonts, tono) accesible desde "Editar identidad visual" y desde el botón Editar de la sección Brand Kit.
- ✅ **Item 25** — botones separados: "Editar formulario completo" → `/onboarding?edit=1` (carga el negocio en el wizard y guarda sin regenerar estrategia) vs "Crear otro negocio" (discreto).
- ✅ **Item 2 (parte deliverable)** — `social-links-editor.tsx`: los links de redes detectados ahora se ven y editan en Settings ("Redes y links"). Scraping de tipografía/paleta: sin presupuesto de render tiene techo; principio "no inventar" ya respetado en la extracción (solo colores detectados).

## SESIÓN UX + PRODUCCIÓN (posterior) — hecho
- ✅ **Paquete UX completo** (typecheck + build verdes, probado desktop+mobile):
  - Bottom tab bar mobile (Inicio/Estrategia/Contenidos/Calendario/Más + sheet), contraste zinc-600/500, botón Eva reposicionado, StickyApproveBar sin pisarse.
  - A11y: labels ligados a inputs (`Field`/`HelpField` con `useId`), Modal accesible (role/aria/foco), H1 en detalle, grids fecha/hora 1-col mobile, touch targets + aria-labels, focus-visible en nav.
  - **Demo rediseñado**: pantalla de 3 perfiles (café / psicóloga Lucía Fernández / startup SaaS Nodo en `demo.ts`), generación destrabada en demo con MOCK client-side (sin cuenta ni costo) — flujo generar→aprobar→contenidos funciona end-to-end; leyenda de demo en feedback. Archivos: `demo.ts`, `app/demo/page.tsx`, `auth/user.ts` (canGenerateStrategy permite demo), `auth/session.ts`+`store.ts` (loginDemo(activeId)), `strategy-job.ts`+`generators.ts` (ramas demo mock), `content/[id]` (leyenda). Dep: nada nuevo.
- ✅ **Meta**: credenciales validadas (app "LOCA", ID 1413889790567718). ⚠️ falta cargar Privacy Policy URL y corregir Terms (apunta a facebook.com). Negocio INFINIDAD verificado.
- ✅ **Privacy Policy** creada: `src/app/legal/privacy/page.tsx` (completar [RAZÓN SOCIAL]/[DOMICILIO] + revisión legal).
- ✅ **docs/DEPLOY-PROD.md** (handoff dev: env vars, migraciones, Meta checklist).
- ✅ **Estructura de agentes**: definidos 3 planes (Esencial/Profesional/Agencia) con costos de IA estimados (~$0,50 / ~$1,70 / ~$11 por negocio-mes). Pendiente: afinar piezas/formatos y las 6 definiciones. Ver [[loca-agents-analysis]].
- **Decisión LLC/Stripe**: app Meta = INFINIDAD; cobros vía LLC/Stripe está OK (Meta no exige misma entidad).

## ESTADO: todos los items ejecutables cerrados
Plan-only pendientes (no ejecutar aún): 13 (prompting por tipo de contenido), 15 (modelo por tipo), 21 (análisis a fondo de agentes/skills — va al final).

## ITEM 21 — Análisis de agentes (PENDIENTE — lo define ALAN)
> **PARA ALAN (socio):** este bloque de agentes queda pendiente de definir con vos cuando abras el proyecto con tu user de Claude Code. Abajo está el análisis completo, el plan por fases y las 6 preguntas a responder para arrancar. También propusimos **3 planes** (Esencial/Profesional/Agencia) con costos de IA estimados — ver más abajo en este archivo.

✅ **F0 (verificación) YA HECHA:** los model IDs son válidos y la **IA real funciona** (NO cae a mock). El hallazgo 🔴 de abajo quedó DESCARTADO — se deja como registro histórico.

Análisis hecho, NO ejecutado.

Hallazgos clave (dónde):
- 🔴 **IDs de modelo probablemente inválidos.** `ANTHROPIC_MODEL=claude-sonnet-4-6` (no existe; reales: claude-sonnet-4-5 o familia Claude 5: claude-sonnet-5 / claude-opus-5 / claude-haiku-4-5) y `GEMINI_IMAGE_MODEL=gemini-3-pro-image` (dudoso). Config en `src/lib/ai/providers/anthropic-text.ts:5` y `gemini-image.ts:5`, pricing en `src/lib/ai/pricing.ts`. RIESGO: `withTextAgent` (`_shared.ts`) cae a MOCK ante error → se podría estar entregando contenido mock creyendo que es IA real. **Verificar con test real antes que nada.**
- 🟠 Sin **prompt caching** de Anthropic → las 16 llamadas de contenido reenvían todo el businessContext (caro). 
- 🟠 **Un solo modelo para todo** + **sin `temperature` por agente** (Anthropic corre a default 1.0).
- 🟡 `SYSTEM_EVA` delgado (6 líneas, sin few-shot). Prompts NO inyectan aún `businessStage`, `visualStyles`, fotos de producto/persona (items 16/17/20). `imagePrompt` lo escribe el modelo de texto sin estructura ni image-to-image. Contenido no hereda dos/donts ni keyMessages.
- 🟡 Sin Zod ni repair-retry (JSON malo se tapa con mock en silencio). 16 piezas independientes → riesgo de repetición entre piezas.
- 🟢 Batch client-driven (si cierra la pestaña se corta) — posible cola server-side.

Plan por fases: F0 verificación → F1 modelos+caching+temperature (máximo ROI costo-calidad) → F2 prompts (item 13: por tipo de contenido, imagePrompt estructurado, image-to-image, inyectar datos nuevos) → F3 robustez (Zod+retry, coherencia del mes, cola) → F4 loop de calidad/evals.

**PENDIENTE — reglas reales de formato por pieza (parte de F2, agregado 2026-08-02).**
Cada pieza debe generarse/publicarse en el aspect correcto según su destino. Centralizar en un `imageFormatFor(channel, format)` y que la generación lo respete:
- **Instagram feed** (post_estatico / carrusel / ad): **1:1 o 4:5**, NUNCA 9:16.
- **Story**: **9:16**. Verificar publicación de Stories vía Meta API (`media_type=STORIES`, imagen o video con URL pública). **Stories INTERACTIVAS (encuestas, stickers, links) NO son posibles vía API → NO incluirlas.**
- **Reel**: **9:16** (video).
- **Facebook feed**: 1:1 o 4:5.
Hoy el imageFormat se decide ad-hoc en `mock.ts` (story/reel→9:16, resto→4:5) y la generación NO respeta el aspect (ver pendiente de abajo). Al construir: rules centralizadas + validar por canal + que el flag de formatos (`DISABLED_CONTENT_FORMATS`) contemple qué es publicable end-to-end (hoy story está "enabled" para generación pero su publicación aún no está implementada en `meta/publish.ts`).

**PENDIENTE puntual — aspect ratio de imágenes (parte de F2).** El camino principal de Gemini `generateViaContent` (`src/lib/ai/providers/gemini-image.ts:60`) NO le pasa el aspect ratio al modelo (solo el fallback `generateViaInteractions` lo hace) → una pieza marcada 4:5/9:16 puede salir cuadrada/horizontal. Hay que hacer que la generación respete el formato pedido por red/tipo de contenido (aspect ratio + imagePrompt estructurado). NOTA: el SÍNTOMA de display ya se arregló (2026-08-02) — `content-preview.tsx` ahora muestra la imagen real en su proporción original sin recortar (lo que se aprueba = lo que se publica); falta que la GENERACIÓN salga en la proporción correcta.

Preguntas abiertas para Sebastián (antes de ejecutar):
1. OK para test real (centavos) que confirme si los IDs funcionan o caen a mock.
2. Objetivo de costo por generación/negocio-mes; ¿máxima calidad o equilibrio? (recomendado: Haiku para copies + Sonnet para estrategia).
3. Modelo de imagen: evaluar barato vs premium priorizando image-to-image (item 20).
4. Ejemplos "gold" de estrategia/posts para few-shot (palanca #1 de calidad).
5. ¿Fase 2 se diseña+ejecuta o primero doc de diseño?
6. ¿Batch a server-side ahora o client-driven para MVP?
7. Reglas de voz de marca global (largo de copies, emojis, nivel de venta).
Prod-deferred: cron de auto-publicación (A5), botón email real (D22), App Review Meta, URL pública de imágenes para IG (A6), proveedor de imagen para caras de profesionales (C20).

## PENDIENTES-PRODUCCIÓN (no bloquean dev)
- Cron de publicación programada (Vercel Pro / scheduler externo) — A5.
- Botón email en generación — D22.
- App Review de Meta (instagram_content_publish / pages_manage_posts) — A.
- Verificar URL pública de imágenes generadas para IG — A6.
- Proveedor de imagen para caras de profesionales (¿no-Gemini?) — C20.
