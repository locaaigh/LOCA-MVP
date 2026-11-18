# Cambios Formulario

Qué cambió en la sección de Formulario a partir de tu feedback de octubre. Está ordenado por tus mismos puntos, con el **antes → ahora** de cada uno.

---

## 1. Inteligencia del análisis de la web

**Tu feedback:** "toma toda la info pero es pobre al definir industria o conceptos". En TSL puso "handmade goods store", y en *a quién le vende* puso "consumidores finales" cuando en realidad vendemos a empresas. Inventó cosas genéricas que no tienen nada que ver.

**Antes:** Eva funcionaba como un "copista": levantaba texto de la web sin razonar el negocio, y cuando no encontraba algo, lo rellenaba con datos genéricos ("Calidad", "Cercanía", etc.).

**Ahora:** Eva analiza el negocio como lo haría un consultor. Concretamente:
- Para definir **a quién le vende (B2B/B2C)** se fija *quién paga*: si la web habla de empresas, pymes o equipos, lo marca **B2B** (ya no asume "consumidores finales" por default).
- Si **no está segura** de la industria, el rubro o el modelo de negocio, **no adivina**: propone **3 a 5 opciones** para que el usuario elija, o lo deja escribir.
- Si no hay señal clara de algo, **lo deja vacío** en vez de inventar un genérico. Vacío honesto antes que relleno de mentira.
- Muestra un cartelito de **"Eva no está 100% segura, ¿cuál encaja mejor?"** con las opciones, en Industria, Subcategoría y "A quién le vendés".

---

## 2. "A quién le vende" / B2B

**Tu feedback:** "no puedo cambiar en 'a quién le vende' por B2B".

**Antes:** El campo existía pero estaba escondido con el nombre técnico "Modelo de negocio", así que no se encontraba.

**Ahora:** Se llama **"A quién le vendés (modelo de negocio)"**, es editable a mano (B2C / B2B / Ambos) y, si Eva dudó, aparecen las opciones para corregir en un clic.

---

## 3. Productos y servicios

**Tu feedback:** "No detecta bien los servicios. En TSL tomó todo como PRODUCTO. Y si dice 'REVISAR', el usuario nunca se entera si no entra."

**Antes:** Clasificaba casi todo como "producto" y los ítems quedaban marcados "Revisar" en silencio: se podía seguir adelante sin mirarlos.

**Ahora:**
- Eva distingue **producto vs servicio** con criterio (un servicio es trabajo/asesoría/atención; un producto es un bien que se compra).
- Los ítems sugeridos por Eva **ahora son de revisión obligatoria**: tienen un botón **"Confirmar"** y **no se puede generar la estrategia** hasta confirmarlos. "Revisar" dejó de ser invisible.

---

## 4. Cosas a evitar — el bug de "Hot Sale / Cyber Monday"

**Tu feedback:** "En 'Cosas a evitar' apareció hot sale / cyber monday. Creo que hubo una gran falla."

**Antes:** Fechas comerciales (Hot Sale, Cyber Monday, Black Friday) se colaban en "cosas a evitar", cuando son todo lo contrario (son oportunidades de venta, no restricciones).

**Ahora:** Se bloqueó por dos lados: Eva tiene prohibido meter fechas/promos ahí, y además un filtro automático descarta cualquier fecha comercial que igual se intente colar. En "cosas a evitar" solo quedan restricciones **reales** de la marca (ej: "no hablar de descuentos").

---

## 5. Temporadas y fechas especiales

**Tu feedback:** debería existir "No tengo temporadas fuertes"; y en fechas especiales quizás incluir la fecha real para que Eva no se olvide.

**Ahora (parcial):** Eva **ya extrae temporadas y fechas especiales de la web** (antes ni las miraba, siempre quedaban pendientes).

**Pendiente (lo vemos juntos como acordamos):** la opción explícita "No tengo temporadas", separar tipos de temporada (estación / trimestre / comercial) y sumar la **fecha real** en el calendario. Es un mini-proyecto aparte.

---

## 6. Identidad visual

**Tu feedback:** "Inventó colores y tipografías que no tienen nada que ver. Si no los reconoce, no debería inventar." Y: "en logos, poder subir uno principal pero también en distintos colores".

**Ahora:**
- Misma regla que el resto: si Eva **no puede leer** un color o tipografía con seguridad, **no lo inventa** (lo deja para que lo cargues vos).
- **Logos:** además de subir varios y marcar el principal, ahora a cada logo le podés poner su **variante** (para fondo claro, fondo oscuro, ícono, horizontal…), así Eva usa el correcto según el caso.

---

## 7. Obligatorios que no funcionaban

**Tu feedback:** "Hay campos obligatorios que no aparecen y se puede armar la estrategia sin completarlos, y eso hace que la estrategia salga muy floja."

**Antes:** Entrando por "pegá tu web" o IA se salteaba la validación, y se llegaba a generar la estrategia con obligatorios vacíos.

**Ahora:** No se puede generar la estrategia con **ningún** obligatorio sin completar, sin importar por dónde hayas entrado. Si falta algo, Eva **te lleva directo** al paso donde está el campo incompleto. (Esto también cubre los productos "a revisar" del punto 3.)

---

## 8. Detalles de UX

- **Cartel "si vendés productos…":** se arregló el contraste (ya no es naranja sobre naranja, se lee bien) y ahora **solo aparece si el negocio vende productos** (no molesta a los que solo dan servicios).
- **Guardar sin perder cambios:** al editar una ficha larga, el botón de **Guardar queda fijo abajo** siempre visible, para que no se pierda lo cargado por tocar fuera.

---

## Lo que probamos en vivo (UAT)

Corrimos el análisis contra una web real de una **consultora de software B2B** (perfil equivalente a TSL, donde antes fallaba). Resultado:

| Lo que fallaba antes | Resultado ahora |
|---|---|
| Ponía B2C / "consumidores finales" | **B2B**, con alta confianza ✅ |
| Tomaba todo como "producto" | **5 servicios + 1 producto**, bien separados ✅ |
| Inventaba industria/rubro | "Tecnología y Software / Consultoría a Medida", correcto ✅ |
| Hot Sale en "cosas a evitar" | Solo restricciones reales ("no muestran precios", "no se posicionan como bajo costo") ✅ |
| Inventaba temporadas | Vacío (una consultora no tiene temporada) — honesto ✅ |

Y lo más importante, el **resumen de negocio** que escribió Eva:

> *"Es una agencia premium que apunta a empresas en sectores de alto riesgo (salud, finanzas). Gana plata vendiendo servicios de consultoría a equipos que no pueden permitirse errores y que valoran la experiencia por encima del precio."*

Eso es análisis de negocio real, no un copy sacado de la web.

**Falta probar:** el selector de 3-5 opciones (necesita una web más ambigua para dispararse) y **la web real de TSL** (pasame la URL y la corremos).

---

## Resumen

| Punto | Estado |
|---|---|
| 1. Inteligencia del análisis | ✅ Hecho y probado |
| 2. B2B editable | ✅ Hecho |
| 3. Productos vs servicios + "Revisar" obligatorio | ✅ Hecho |
| 4. Bug Hot Sale / Cyber Monday | ✅ Hecho y probado |
| 5. Temporadas y fechas | 🟡 Extracción lista; el resto, mini-proyecto aparte |
| 6. Identidad visual (no inventar + logos) | ✅ Hecho |
| 7. Obligatorios | ✅ Hecho |
| 8. UX (cartel + guardar) | ✅ Hecho |

Todo está en producción.
