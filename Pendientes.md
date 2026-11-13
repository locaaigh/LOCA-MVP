# Pendientes

Lo que quedó abierto del trabajo sobre el Formulario (commit `2480c36`, base: [cambios Formulario.md](cambios%20Formulario.md)).

---

## Dónde quedamos (12-nov-2026)

**Mergeado a `main`:** #14 (UA anti-bot + ecommerce laxo), #15 (industria de lista cerrada), #17 (pendientes en una página), #18 (gate del final usa la misma fuente de críticos).

**PRs abiertos, esperando prueba/merge:**
- **#19 — Análisis web**: descripción ya no queda clavada con basura de plantilla (caso Avada en mateando.com.ar), nombre confiable (og:site_name + IA), servicios resumidos en 1-2 si no hay precios, colores reales (blacklist de defaults iOS/sociales + frecuencia + colores del logo con sharp).
- **#20 — Onboarding**: "Completá lo que falta" ahora va paso a paso con los pasos del wizard (solo obligatorios incompletos, dinámico).

**Validado en prod (12-nov):** `/api/extract` con mateando.com.ar → análisis correcto (yerba CBSé), modelo `claude-opus-5-5`, ~$0.12/análisis.

---

## 5. Temporadas y fechas especiales 🟡

**Estado:** la *extracción* desde la web ya funciona (Eva ya detecta temporadas y fechas especiales).

**Falta (mini-proyecto aparte, lo vemos juntos):**
- Opción explícita **"No tengo temporadas fuertes"**.
- Separar **tipos de temporada**: estación / trimestre / comercial.
- Sumar la **fecha real** en el calendario para que Eva no se la olvide.

---

## Por probar (UAT)

- **Selector de 3-5 opciones**: necesita una web más ambigua para dispararse y poder validarlo.
- **Web real de TSL**: correr el análisis contra la URL real (perfil donde antes fallaba). *Falta que pasen la URL.*

---

## Motor NUEVO-v2 (en prod) — prerequisitos y pendientes

El motor de contenido de Sebi (100% su entrega) + los 4 fixes está **en prod** (PR #13). Falta/queda:

- [x] ~~Correr la migración `0008_content_generation.sql`~~ **Hecho (13-nov)**: columna `generation` verificada en `contents`.
- [x] ~~Correr la migración `0009_admin_backoffice.sql`~~ **Hecho (13-nov)**: `admin_users` con Alan (`alanroit@gmail.com`) y Sebi (`sebiadler@gmail.com`) ✓, `onboarding_field_config` creada ✓. `/admin` en prod ✓ (PRs #21, #22).
- [x] ~~Correr la migración `0010_field_config_texts.sql`~~ **Hecho (13-nov)**.
- [ ] **Correr la migración `0011_website_analysis_log.sql`** en Supabase (tab "Análisis de Eva" del backoffice: log de calidad de cada análisis de web / import .md). Hasta correrla, la tab avisa que falta la migración y no se registra nada.
- [ ] **OpenAI**: cargar `OPENAI_API_KEY` en Vercel, correr `scripts/ai-v2/verify-image-models.mjs`, y pasar `AI_IMAGE_ROUTING=matrix` (hasta entonces, gemini-only).
- [ ] **Verificar prueba clave** en prod: pieza educativa/promo con texto SOBRE la imagen; `/api/status` → `hasSharp: true`.
- Fuera de alcance de Sebi (para más adelante): UI del brand kit, carrusel, V1/V2, auto-publicación.

---

## Análisis de web — pendientes

- [ ] **Latencia del `website-extract` 🟠**: con Opus 5.5 (esfuerzo alto) tardó **~55 s** en la prueba real, y la ruta `/api/extract` tiene `maxDuration=60` en **Vercel Hobby** → **al límite, puede dar timeout en prod**. Opciones: bajar modelo/esfuerzo de ese agente, o pasar a Vercel Pro (120 s).
- [ ] **Conversión principal por IA (fix mejor, PR aparte)**: hoy `primaryConversion` la decide un heurístico de regex (se endureció en el PR #14, pero sigue siendo regex). Mejor sería que la **decida la IA**, que ya entiende bien el objetivo del negocio.

**Hecho (PR #14):** fix del User-Agent anti-bot (Eva no podía leer sitios con protección por fingerprint) + detección de ecommerce demasiado laxa (marcaba "Compra ecommerce" en agencias B2B).
