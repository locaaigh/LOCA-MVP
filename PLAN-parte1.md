# Plan LOCA — P0 / P1 / P2

Estado del plan de auth, sesiones y signup gate. Actualizado jul 2026.

---

## Resumen

| Bloque | Estado | Notas |
|--------|--------|-------|
| **P0** | ✅ Completo | Commiteado y pusheado |
| **P1** | ✅ Completo (variante acordada) | Commiteado y pusheado |
| **P1.5** | ⚠️ Parcial | Huecos menores de robustez |
| **P2** | ❌ Pendiente | Pulido, no bloquea MVP |
| **Roadmap** | ❌ Fuera de scope | Publicación en redes, Ads API reales |

---

## P0 — Sesión y auth ✅

**Commit:** `ca762de` — *Fix session handling to prevent auth races and cross-account data bleed.*

| # | Item | Estado |
|---|------|--------|
| 1 | Login: esperar sesión antes de navegar | ✅ |
| 2 | Login: redirect si ya hay sesión activa | ✅ |
| 3 | Logout: limpiar datos locales (nube intacta) | ✅ |
| 4 | `SIGNED_IN`: si cambió `userId` → limpiar + hidratar | ✅ |
| 5 | Demo: `signOut` antes de `loginDemo` | ✅ |
| 6 | Ruta `/auth/callback` (confirmación email / OAuth) | ✅ |

**Fix relacionado (mismo día):** `7b40abf` — restore de `flowState` en hidratación para que el estudio de contenidos muestre datos sincronizados.

---

## P1 — Signup gate y robustez ✅

**Commit:** `56b91f3` — *Require signup before strategy and run generation in the background.*

### Items del plan original

| # | Item plan original | Estado | Notas |
|---|------------------|--------|-------|
| 7 | Re-hidratar en cada `SIGNED_IN` | ⚠️ Parcial | Solo si cambia `userId` (ver P1.5) |
| 8 | Onboarding requiere auth con Supabase | ✅ Variante B | Signup **al final** del onboarding, no al inicio |
| 9 | 401 en snapshot/sync → logout + login | ✅ | `handleAuthFailure` + `?reason=session_expired` |
| 10 | Demo-gate en `syncRepositoryToServer` | ✅ | No sync en demo ni usuario local fake |
| 11 | Middleware guard en `(app)/*` | ❌ Postergado | Choca con modo demo (ver P1.5) |

### Implementado además del plan

- Modal de signup al confirmar onboarding (`OnboardingSignupModal`)
- Borrador en `sessionStorage` + retoma post-login (`onboarding-draft.ts`)
- Gate en página Estrategia si usuario local legacy (`negocio_*@loca.app`)
- Estrategia en background: fetch largo en browser + spinner en menú + toast
- Sync no pisa `strategyJob` (server-authoritative)
- UX usuarios logueados: dashboard, auto-generación, botones coherentes
- Signup sin confirmación por email → redirect a dashboard
- Nombre de persona en blanco en modal de signup

### Flujo acordado (signup)

```
Onboarding libre (sin cuenta)
  → Resumen → Confirmar
  → Modal signup/login (si no hay sesión real)
  → Dashboard + estrategia en background
```

---

## P1.5 — Pendiente (robustez, no bloqueante)

| # | Item | Prioridad | Descripción |
|---|------|-----------|-------------|
| 1 | Re-hidratar siempre en `SIGNED_IN` | Media | Hoy `AuthProvider` solo hidrata si `userId` cambió; mismo usuario re-logueado en la misma pestaña puede ver datos viejos |
| 2 | Middleware guard `(app)/*` | Media | Requiere definir estrategia demo: cookie `loca-demo`, rutas separadas, o deshabilitar demo con Supabase ON |
| 3 | Commitear docs | Baja | `AGENTS.md`, `RESUMEN-2026-07-02.md`, este archivo |

---

## P2 — Pendiente (pulido)

| # | Item | Descripción |
|---|------|-------------|
| 1 | Sync multi-tab | Dos pestañas no se sincronizan hasta recargar |
| 2 | Separar demo de cuenta real | `hydrateFromServer` aún conserva negocios demo locales mezclados con cuenta real |
| 3 | UI sesión expirada in-app | Hoy solo mensaje en `/login?reason=session_expired`; falta toast/banner en la app |
| 4 | `localStorage` namespaced por `userId` | Alternativa más fina que `clearUserData` al logout |

---

## Roadmap — Fuera del plan auth (README)

No implementado; documentado como fuera de scope del MVP actual.

| Feature | Estado |
|---------|--------|
| Publicación automática Meta / IG / FB | ❌ |
| Publicación LinkedIn | ❌ |
| Meta / Google Ads API (campañas reales) | ❌ — hoy `metaAdsAgent` / `googleAdsAgent` solo generan **texto de estrategia** |
| Email marketing real | ❌ |
| Analytics reales | ❌ |
| Pagos | ❌ |

Ver guía de setup futuro: conversación / doc de integraciones sociales (Meta + LinkedIn).

---

## Commits relevantes (orden cronológico)

| Commit | Fecha | Qué |
|--------|-------|-----|
| `7b40abf` | 2026-07-02 | Restore guided flow state on hydration |
| `ca762de` | 2026-07-02 | P0 session handling |
| `56b91f3` | 2026-07-02 | P1 signup gate + estrategia background |

---

## Archivos de documentación en repo

| Archivo | Contenido | Commiteado |
|---------|-----------|------------|
| `AGENTS.md` | 9 agentes de Eva, skills, pipeline | ❌ |
| `RESUMEN-2026-07-02.md` | Resumen informal del día | ❌ |
| `PLAN.md` | Este archivo | ❌ |

---

## Próximo paso sugerido

1. Commitear docs (`AGENTS.md`, `RESUMEN-2026-07-02.md`, `PLAN.md`)
2. Si aparecen bugs de sesión en prod → P1.5 item 1 (re-hydrate)
3. Antes de abrir la app sin demo → P1.5 item 2 (middleware)
4. P2 cuando haya tiempo de pulido
