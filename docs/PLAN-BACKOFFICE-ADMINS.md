# Plan: Backoffice de Admins — LOCA

> Estado: **Fases 0–3 implementadas** (13-nov-2026). Fases 0+1 en prod (PRs #21/#22, migración 0009 corrida). Fase 2 (gate server-side) PR #23. Fase 3 (orden + textos editables) requiere migración `0010`.
> Pendiente: Fase 3b (unificación con el wizard manual) y Fase 4 (backoffice general: flags, usuarios, métricas).
> Nota Fase 3: los textos editados aplican al flujo "Completá lo que falta", al 1-de-N y a los avisos de faltantes; el wizard manual mantiene sus textos hardcodeados hasta la unificación.

## Hallazgos del código que condicionan el diseño

1. **Ya existe el precedente exacto**: `special_dates_catalog` (migración `0004`) es una tabla de configuración editable sin redeploy, con fallback a los estáticos de código si Supabase falla, caché server de 5 min y ruta API pública de lectura. El field-config debería calcar ese patrón.
2. **Hay TRES nociones de "obligatorio"**, no una:
   - (a) `FIELD_REQUIREMENTS` bloquea **cada paso del wizard manual**;
   - (b) el flag `required` de `BusinessQuestion` gobierna **"Completá lo que falta"** post-análisis;
   - (c) `critical` bloquea la **generación de estrategia**.
   El backoffice MVP edita **(b)**.
3. **El gate de críticos es solo client-side**: ninguna ruta de `/api/strategy` revalida en servidor (riesgo preexistente).
4. **No existe noción de roles hoy** en `src/lib/auth/`. El middleware es fail-open (si Supabase no responde, deja pasar) — para `/admin` hay que invertirlo (fail-closed).

## 1. ¿Dónde vive la config? → Defaults en código + overrides en Supabase

- El código sigue siendo dueño de **qué campos existen** (labels, secciones, get/apply). La DB guarda solo **las excepciones**: "este campo dejó de ser obligatorio".
- Tabla `onboarding_field_config` (ver anexo). Tabla vacía ⇒ todo funciona como hoy. Supabase caído ⇒ defaults de código, nadie se entera.
- **Lectura pública** (el onboarding corre anónimo): `GET /api/onboarding/field-config`, caché server 5 min, el cliente arranca con defaults y aplica overrides cuando llegan (mismo patrón que special-dates).
- **Escritura solo admins**: ruta `/api/admin/*` + RLS en la tabla (doble candado).
- Cada fila guarda `updated_by` / `updated_at` (quién tocó qué).

**¿`critical` editable? SÍ, desde el MVP** (decisión de Alan, 12-nov: todavía no están seguros de qué es crítico de verdad — ej. productos/servicios — y el backoffice es justamente la herramienta para experimentarlo sin deploys).

Con tres guardas en lugar de prohibición:
1. **Invariante crítico ⇒ obligatorio**, aplicado automáticamente: prender "Crítico" fuerza "Obligatorio" (y lo bloquea); para apagar "Obligatorio" en un crítico primero hay que apagar "Crítico". Nunca puede existir un campo crítico y opcional (terminarías el onboarding sin un dato que después te bloquea la estrategia).
2. **Piso mínimo intocable**: `name` e `industry` quedan críticos por código (sin esos dos, los prompts generan estrategia de otra cosa). TODO lo demás —incluido productos/servicios— es editable.
3. **Modal de advertencia al apagar un crítico**: explica el efecto real ("Eva va a poder generar estrategia aunque este dato esté vacío; la calidad puede bajar") y queda la auditoría de quién lo cambió. Apagar un crítico no rompe nada técnicamente: los prompts ya toleran datos vacíos (ej. productos sin cargar se interpola como "(sin cargar)") — lo que cambia es la calidad del resultado, y eso es una decisión de producto, o sea de los admins.

La columna `critical` de la tabla se usa desde el día 1 (nullable = default de código).

## 2. ¿Mismo repo o repo aparte? → Ruta `/admin` dentro de LOCA-MVP

| Criterio | `/admin` en LOCA-MVP ✅ | Monorepo (2 apps) | Repo nuevo |
|---|---|---|---|
| Costo Vercel Hobby | 1 proyecto, $0 extra | 2 proyectos | 2 proyectos |
| Registro de campos | Importa `QUESTIONS` directo | Compartible | **Se duplica → diverge** |
| Velocidad (2 admins) | Máxima | Media | Lenta (2 pipelines, 2 auths) |
| Seguridad | Mitigable (404 + RLS) | Dominio separado | Dominio separado |
| Roadmap (métricas, usuarios) | `events` y `ai_usage_log` ya viven acá | OK | Duplicar tipos y repo |

El único argumento para separar es la superficie de seguridad, y para 2 admins se mitiga: la ruta devuelve **404 a no-admins** (no revela que existe), noindex ya activo, y la protección real es server + RLS. Si el backoffice crece en 2027, extraerlo es barato porque la config ya vive en Supabase.

Detalle: `/admin` debe sumarse a `APP_PREFIXES` del middleware (vive en app.heyloca.ai, no en el dominio de marketing).

## 3. Roles de admin: tabla `admin_users` desde el día 1

(No allowlist por env var: las policies de RLS necesitan algo en la DB contra qué chequear.)
Alta de Alan y Sebi: un insert en la misma migración.

Tres capas (ninguna es "solo UI"):
1. **Middleware**: `/admin/*` sin sesión → login. **Fail-closed** (sin verificación, no entrás).
2. **Server layout** (`/admin/layout.tsx`): sesión + membresía en `admin_users`; si no → `notFound()` (404, no 403).
3. **API + RLS**: `/api/admin/*` valida admin server-side y escribe con el **cliente de sesión** (no service role) → RLS es el candado final.

## 4. UI del MVP: `/admin/onboarding-fields`

- Lista los campos de `QUESTIONS` agrupados por sección (reutiliza `SECTION_LABELS`): label + **dos toggles: Obligatorio y Crítico**.
- Invariante en la UI: Crítico ON ⇒ Obligatorio queda ON y bloqueado. Apagar un crítico pide confirmación (modal con el efecto real).
- `name` e `industry`: toggles bloqueados (piso mínimo, con tooltip del porqué).
- "Cambiado por sebi@… el 12/11" + botón "Restaurar default" (borra el override).
- Guardado por toggle (PATCH optimista con revert si falla).
- Consumo en onboarding: setter `applyFieldConfigOverrides()` en `business-questions.ts` + fetch al montar (espejo del fetch de special-dates). Sin fetch/sin DB: comportamiento actual intacto.

## 5. Fases

| Fase | Qué incluye | Tamaño |
|---|---|---|
| **0 — Infra admin** | Migración `admin_users` + config, gate `/admin`, middleware fail-closed | S |
| **1 — MVP required + critical** | Tabla + APIs + pantalla con ambos toggles (invariante, piso mínimo, modal de advertencia) + consumo con fallback | M |
| **2 — Gate server-side de estrategia** | `/api/strategy` revalida los críticos leyendo la MISMA config (hoy el gate es solo client-side; al volverse configurable, urge más) | S/M |
| **3 — Orden y textos** | `sort_order`, labels/placeholders editables, unificación con el wizard manual | M/L |
| **4 — Backoffice general** | Feature flags, usuarios/negocios, métricas sobre `events` y `ai_usage_log` | L |

## 6. Decisiones abiertas (confirmar Alan/Sebi)

1. ¿El toggle afecta también el **wizard manual paso a paso**? MVP propone que no (son sistemas distintos; unificar en Fase 3).
2. ~~Critical en código~~ **Resuelto (12-nov)**: ambos flags editables desde el MVP, con piso mínimo. Queda confirmar el piso: ¿`name` + `industry` intocables alcanza, o querés que TODO sea editable?
3. Cambios tardan **hasta 5 min** en verse (caché). ¿Aceptable? (Alternativa: botón "purgar caché".)
4. **Gate server-side de estrategia** pasa a Fase 2 inmediata (riesgo preexistente que se agrava con criticals configurables).
5. Alta de nuevos admins por SQL manual — ¿alcanza por ahora?
6. Demo y tests siguen con defaults de código (la config de DB no aplica ahí).
7. Supabase caído ⇒ un campo "liberado" vuelve a ser obligatorio mientras dure la caída (caso borde aceptado).

---

## Detalle Fase 3b — Unificación con el wizard manual (13-nov)

Hoy conviven TRES fuentes sobre los campos: `business-questions` (19 campos, lo que edita `/admin`), `field-requirements` (~34 campos, bloqueo por paso del wizard manual) y los textos hardcodeados en el JSX del wizard. Un cambio en `/admin` NO afecta al camino manual.

| Sub-paso | Qué cambia | Tamaño |
|---|---|---|
| **3b.1 — Textos** | Labels/placeholders/ayudas del wizard leen del registro → las ediciones de texto del admin aplican también al formulario manual | S/M |
| **3b.2 — Registro único** | Los ~15 campos exclusivos del wizard entran al registro unificado; la validación por paso lee de ahí; `field-requirements` desaparece | M |
| **3b.3 — Admin completo** | `/admin` muestra todos los campos por paso del wizard; el toggle Obligatorio afecta también el bloqueo paso a paso (cierra la decisión abierta #1) | S |

Riesgo: refactor del corazón de la validación (page.tsx ~2000 líneas) → tres PRs chicos con QA de los 7 pasos después de cada uno.

## Detalle Fase 4 — Backoffice general (13-nov)

Materia prima ya en DB sin UI: `events` (funnel completo), `ai_usage_log` (modelo/tokens/costo por llamada), `website_analysis_log` (calidad de análisis).

| Tab | Qué muestra/hace | Tamaño |
|---|---|---|
| **4a — Métricas** | Funnel de onboarding (con drop-off por campo vía `validation_failed`), costos de IA por día/agente/modelo, calidad de Eva agregada (tasa de éxito, ranking de campos que no puede completar) | M |
| **4b — Usuarios y negocios** | Lista de usuarios + negocios + estado (onboarding/estrategia/último acceso), detalle read-only, gestión de admins desde UI | M |
| **4c — Feature flags** | Tabla `app_flags` (mismo patrón: defaults en código + overrides DB + caché + fallback) para prender/apagar features sin deploy | S/M |
| **4d — Catálogos** | UI para `special_dates_catalog` (hoy editable solo por SQL) | S |

**Orden recomendado:** 4a → 3b.1 → (3b.2/3b.3 vs 4b según necesidad).

## Anexo técnico

### Migración propuesta (`supabase/migrations/0009_admin_backoffice.sql`)

```sql
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
-- Cada usuario ve SOLO su propia fila (lo justo para que otras policies
-- hagan el exists() sin recursión).
create policy admin_users_self_read on public.admin_users
  for select using (user_id = auth.uid());

insert into public.admin_users (user_id, email)
select id, email from auth.users where email in ('<email de Alan>', '<email de Sebi>');

create table public.onboarding_field_config (
  field_id text primary key,          -- id de BusinessQuestion (ej: 'values')
  required boolean,                   -- null = default de código
  critical boolean,                   -- fase 2; null = default de código
  updated_by uuid references auth.users (id) on delete set null,
  updated_by_email text,
  updated_at timestamptz not null default now()
);
alter table public.onboarding_field_config enable row level security;
create policy field_config_public_read on public.onboarding_field_config
  for select using (true);            -- config no sensible; onboarding anónimo
create policy field_config_admin_write on public.onboarding_field_config
  for all
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
```

### Rutas

| Ruta | Método | Auth | Función |
|---|---|---|---|
| `/api/onboarding/field-config` | GET | pública | Overrides efectivos, caché 5 min, `[]` si DB caída |
| `/api/admin/field-config` | GET | admin | Defaults + overrides + updated_by |
| `/api/admin/field-config` | PATCH | admin + RLS | `{ fieldId, required?, critical? }` — valida invariante crítico⇒obligatorio y rechaza cambios sobre el piso mínimo (`name`, `industry`) |
| `/admin/onboarding-fields` | — | admin (layout server) | UI |

### Archivos

**Nuevos:** `supabase/migrations/0009_admin_backoffice.sql` · `src/lib/auth/admin.ts` · `src/lib/onboarding/field-config.ts` (patrón de `special-dates.ts`) · `src/app/api/onboarding/field-config/route.ts` · `src/app/api/admin/field-config/route.ts` · `src/app/admin/layout.tsx` · `src/app/admin/onboarding-fields/page.tsx`

**A modificar:** `src/lib/business-questions.ts` (setter de overrides) · `src/middleware.ts` (`/admin` + fail-closed) · `src/app/onboarding/page.tsx` (fetch de config al montar)
