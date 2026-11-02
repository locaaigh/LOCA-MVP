# Pendientes

Lo que quedó abierto del trabajo sobre el Formulario (commit `2480c36`, base: [cambios Formulario.md](cambios%20Formulario.md)).

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

## NUEVO-v2 (entrega de Sebi) — capa de IA

> **Qué entró:** agentes, modelos y pipeline de creación de contenido. Integrado y adaptado a
> **nuestros** modelos productivos: texto `claude-sonnet-4-6` (con temperature), imagen
> Gemini `gemini-3-pro-image`, OpenAI afuera. Branch `feat/ai-v2`.

### Operativo — para encenderlo en prod
- [ ] Confirmar env en Vercel: `ANTHROPIC_MODEL=claude-sonnet-4-6`, `GEMINI_IMAGE_MODEL=gemini-3-pro-image`.
- [ ] Commit + push de `feat/ai-v2` → merge a main (desde terminal propia; el entorno de Claude no tiene SSH).
- [ ] Prueba de fuego real con Gemini (`npx tsx scripts/ai-v2/smoke-pipeline.ts`).
- [ ] `maxDuration=120` en `/api/image` requiere **Vercel Pro** (en Hobby el tope es 60s).
- [ ] Proveedor de capturas para la lectura visual de la web (`BROWSERLESS_URL` o `SCREENSHOT_URL_TEMPLATE`); sin esto, el plan B visual del onboarding no corre.

### Fuera de entrega — "queda para Alan" (sección 10 del plan de Sebi)
> Textual de Sebi: *"Por decisión de Sebastián, no entra nada que no sea agentes, modelos y la
> tab de creación de contenido."* En varios, el **backend ya está hecho**; falta la UI o la
> publicación.
- [ ] **UI del brand kit**: elegir familia/variante/sistema tipográfico con thumbnails; checkbox de consentimiento de imagen; subir TTF propia; selector de redes por pieza. *(Backend listo.)*
- [ ] **Carrusel**: UI (preview, reordenar, regenerar slide) + publicación. Generación ya lista; el flag sigue apagado en `DISABLED_CONTENT_FORMATS`.
- [ ] **V1/V2**: UI para elegir entre versiones. *(Datos ya guardados en `versions[]`.)*
- [ ] **Publicación**: stories y carruseles en Meta/LinkedIn; cron de auto-publicación; validar proporción en la ruta de publicación (`assertImageMatchesFormat` ya lista).
- [ ] **Mejoras futuras**: similitud facial por embeddings (ArcFace) en vez del chequeo por visión; Batch API para generación nocturna.
- [ ] **Ajenos a la IA** (los menciona Sebi pero son otra cosa): Google login, "olvidé mi contraseña", LinkedIn OAuth, filtros de biblioteca, bug de "contenido no encontrado" (es de sincronización).

### Descartado por nuestra decisión de modelos (no usamos OpenAI)
- Verificación de OpenAI (`verify-image-models.mjs` para Sunburst/Flare).
- Matriz de ruteo a OpenAI (queda latente/apagada en el código).
- Recraft para vectorial.
