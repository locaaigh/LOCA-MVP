# LOCA — Humanless marketing 💗🟢

MVP funcional de **LOCA**: una _low-cost agency_ automatizada. El usuario completa **un formulario** y **Eva** (la agente de IA) genera estrategia, calendario, contenidos, copies, imágenes y estrategia de Ads — todo en español, listo para revisar y publicar manualmente.

> **Un formulario. Eso es todo.**

---

## 🚀 Cómo correr localmente

> El proyecto está en `/Users/Sebastian/Desktop/LOCA-MVP`
> (se movió desde `LOCA!/LOCA MVP` porque Webpack/Next.js **no compila con `!` en la ruta**).

`npm` no estaba disponible en el sistema, así que se instaló en `~/.local/bin`. Si `npm` no te responde, agregá esto a tu `~/.zshrc` (una sola vez):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Después:

```bash
cd /Users/Sebastian/Desktop/LOCA-MVP

npm install        # ya está instalado, pero por las dudas
npm run dev        # http://localhost:3000
```

Otros comandos:

```bash
npm run build      # build de producción
npm run start      # correr el build
npm run typecheck  # chequeo de tipos
```

---

## 🧪 Probar el modo demo (sin configurar nada)

1. Abrí `http://localhost:3000`
2. Click en **“Probar demo”** (o entrá directo a `/demo`).
3. Se cargan dos negocios demo: **Café Bruma** y **Casa Nativa**.
4. En el dashboard, generá **Estrategia → Calendario → Contenidos** (en ese orden).
5. Entrá a una pieza desde el **Estudio de contenidos** y probá: generar imagen (placeholder de marca), aplicar feedback, aprobar/rechazar, copiar caption, exportar.

Todo funciona **sin API key**, usando contenidos mock inteligentes (basados en los datos reales del negocio) y placeholders visuales de marca.

---

## 🔑 Activar IA real (texto + imágenes)

Creá un archivo **`.env.local`** en la raíz del proyecto:

```bash
OPENAI_API_KEY=sk-...tu-clave...
# opcionales:
OPENAI_TEXT_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
```

Reiniciá `npm run dev`. A partir de ahí:

- Eva genera estrategia / calendario / contenidos / ads con el LLM.
- Las imágenes se generan de verdad con la **OpenAI Images API** (1:1, 4:5 o 9:16).
- Si una llamada falla, **no se rompe nada**: cae automáticamente al modo mock y muestra un aviso no bloqueante.

El badge del dashboard indica el estado: **“IA real activada”** o **“Modo demo · sin API key”**.

---

## 🗺️ Rutas

| Ruta | Qué hace |
|------|----------|
| `/` | Home / landing |
| `/login`, `/signup` | Auth mock (cualquier email) |
| `/demo` | Carga negocios demo y entra |
| `/onboarding` | Wizard de 5 pasos para crear el negocio |
| `/dashboard` | Resumen + botones de generación |
| `/strategy` | Estrategia completa + exportar/imprimir |
| `/calendar` | Calendario mensual (8/16/30 posts) + CSV |
| `/content` | Estudio de contenidos (filtros, preview) |
| `/content/[id]` | Detalle: editar, imagen, feedback, aprobar/exportar |
| `/ads` | Estrategia de Meta Ads y Google Ads |
| `/settings` | Cuenta, IA, negocios, reset |

---

## 🧱 Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Zustand** con persistencia en **localStorage** (mock DB, cero setup)
- **OpenAI** SDK (texto + imágenes) con **provider adapter** y fallback mock
- **Zod** disponible para validación; las respuestas de IA se normalizan antes de guardar
- Listo para **Vercel** (los route handlers son `nodejs` runtime)

### Estructura principal

```
src/
├── app/
│   ├── page.tsx                 # Home
│   ├── login | signup | demo | onboarding
│   ├── (app)/                   # Shell con sidebar (auth-guarded)
│   │   ├── dashboard | strategy | calendar | content | content/[id] | ads | settings
│   └── api/                     # strategy, calendar, content, content/feedback, image, ads, status
├── components/                  # ui, app-shell, brand, content-preview, ai-status
└── lib/
    ├── types.ts                 # modelo de datos completo
    ├── constants.ts             # industrias, valores, formatos, feedback…
    ├── store.ts                 # estado + persistencia local
    ├── demo.ts                  # Café Bruma + Casa Nativa
    ├── generators.ts            # hook que orquesta API + store
    ├── exports.ts               # CSV + HTML imprimible
    ├── placeholder.ts           # placeholders SVG de marca
    └── ai/
        ├── service.ts           # 🧠 servicio central de IA
        ├── openai.ts            # cliente + JSON mode
        ├── prompts.ts           # prompts de Eva (español, "vos")
        └── mock.ts              # generadores mock inteligentes
```

---

## ✅ Qué hace el MVP

- Crear negocio vía onboarding (5 pasos) o usar modo demo.
- Generar **estrategia**, **calendario (16 posts por defecto)**, **contenidos**.
- Generar **imágenes reales** con IA (o placeholders en modo demo).
- **Editar, aprobar, rechazar, regenerar** piezas; aplicar **feedback predefinido** o libre.
- **Estrategia de Meta Ads y Google Ads.**
- **Exportar**: calendario CSV, contenidos CSV, estrategia HTML imprimible/PDF, copiar caption/hashtags/prompt, descargar imagen.
- Estados de publicación: _pendiente_ / _listo para publicar_ / _publicado manualmente_.

## 🚫 Fuera de alcance (a propósito)

Sin publicación automática en redes, sin Meta/Google Ads API, sin pagos, sin email marketing real, sin analytics reales, sin marketplace de curadores.

---

## 🧩 Qué quedó mockeado

- **Persistencia**: localStorage (no hay DB). El modelo de datos en `src/lib/types.ts` mapea 1:1 a las tablas sugeridas (Supabase) para migrar fácil.
- **Auth**: mock por email (sin contraseña ni Supabase Auth).
- **IA sin API key**: textos mock contextualizados + imágenes placeholder SVG de marca.
- **Publicación**: solo estados internos, nunca publica en redes.

---

## 🔜 De MVP a V1 (próximos pasos)

1. **Supabase**: mover el store a Postgres + Auth real (el esquema ya está en `types.ts`).
2. **Persistir imágenes** en Supabase Storage / S3 (hoy las reales viven como data URL en memoria/localStorage; ojo con la cuota).
3. **Cola de generación** server-side para los 16+ contenidos (hoy es secuencial desde el cliente).
4. **Validación con Zod** estricta + reintentos en las respuestas del LLM.
5. **Pagos** (Stripe) y planes.
6. Integraciones reales de publicación (Meta/IG/TikTok) y Ads API.
7. Analytics y optimización automática.
8. Multi-usuario / multi-negocio por organización.

---

LOCA — _Humanless marketing._ Tu marketing listo en minutos.
