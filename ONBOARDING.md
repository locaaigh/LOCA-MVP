# LOCA MVP — Guía rápida para levantar el proyecto

Este ZIP ya incluye `.env.local` con todas las credenciales reales
(Anthropic, Gemini, Supabase, Meta). No hace falta pedir ni configurar
ninguna key — solo instalar dependencias y correr.

## 1. Requisitos

- Node.js 20 o superior (se probó con Node 22).
- npm (viene con Node).

## 2. Instalar y correr

```bash
cd LOCA-MVP
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

Otros comandos útiles:

```bash
npm run typecheck   # chequeo de tipos
npm run build       # build de producción
npm run lint        # lint
```

## 3. Base de datos (Supabase)

El proyecto ya apunta a la Supabase real (ver `NEXT_PUBLIC_SUPABASE_URL`
en `.env.local`). Las migraciones viven en `supabase/migrations/` y se
aplican pegando el SQL de cada archivo, en orden, en el
**Supabase Dashboard → SQL Editor**. Si alguna ya fue aplicada, correrla
de nuevo no debería romper nada (usan `if not exists` donde aplica), pero
fijate primero si la tabla ya existe para no reinsertar datos de más.

Migraciones actuales: `0001_init.sql` → `0005_ai_usage_log.sql`.

## 4. Sin configurar nada (modo demo)

La app también funciona sin ninguna variable de entorno — entrando a
`/demo` se cargan dos negocios de ejemplo (Café Bruma, Casa Nativa) y
todo corre con datos simulados. Con `.env.local` ya cargado, en cambio,
vas a estar usando IA real (Claude/Gemini) y la base de datos real, así
que cualquier negocio que crees o generación que hagas queda persistida
de verdad — tené cuidado de no pisar datos de otros negocios reales.

## 5. Dónde mirar si te perdés

- `README.md` — detalle completo del proyecto, rutas y stack.
- `CLAUDE.md` — instrucciones vigentes para trabajar con Claude Code acá
  (hay un rediseño de UI en curso; la lógica no debe cambiar).
- `FUNCTIONALITY.md` — comportamiento funcional documentado de la app.
- `AGENTS.md` — contexto adicional para agentes/IA trabajando en el repo.

## 6. Trabajando con Claude Code

Al abrir esta carpeta con Claude Code, ya va a leer `CLAUDE.md`
automáticamente. Si tenés dudas sobre una funcionalidad específica,
pedile que lea `FUNCTIONALITY.md` primero antes de tocar código.
