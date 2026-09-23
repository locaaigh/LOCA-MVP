# Checklist de verificación — App Review de Meta (Alan)

**Por qué esto importa:** ya está cargada en el dashboard de Meta la solicitud de
revisión, con las instrucciones textuales que va a seguir un revisor humano.
Si el revisor sigue ese guion en `app.heyloca.ai` y algo falla, **rechazan la
solicitud completa** y se pierden 1-2 semanas. Este checklist es para garantizar
que producción hace exactamente lo que las instrucciones prometen.

Especificación técnica completa: `docs/INTEGRACIONES-META-IG-PENDIENTES.md`.

---

## 0. Antes de empezar

- [ ] `git pull` en `main` y confirmar qué commit está deployado en producción.
- [ ] Decir explícitamente si hay cambios en otra rama que ya estén en prod
      (el repo local de Sebastián no tiene el fix de `config_id`).

---

## 1. Código — 4 arreglos obligatorios

### 1.1 `config_id` (BLOQUEANTE #1)

La app de Meta es tipo **Business** → el diálogo OAuth debe usar Facebook Login
for Business con `config_id`, no `scope`.

```bash
grep -n "config_id\|scope" src/lib/meta/oauth.ts
```

- Hoy: `src/lib/meta/oauth.ts` (~línea 59) manda `scope: getMetaScopes().join(",")`.
- **Síntoma en producción:** al conectar, Meta no otorga los permisos,
  `/me/accounts` vuelve vacío y **no se listan las páginas del usuario**.
- Debe quedar: `config_id` desde `process.env.META_LOGIN_CONFIG_ID`
  (valor: `814070598398388`).

- [ ] Implementado y deployado
- [ ] Verificado que al conectar aparecen las páginas

### 1.2 `read_insights` en los scopes

```bash
grep -n "DEFAULT_SCOPES" -A 10 src/lib/meta/config.ts
```

- El código lee insights de página (`src/lib/meta/insights.ts:51`) pero el scope
  nunca se pedía. Agregarlo a `DEFAULT_SCOPES` **y** confirmar que está en la
  configuration del dashboard (los 9 permisos).

- [ ] Agregado

### 1.3 Versión de Graph API

```bash
grep -n "META_GRAPH_VERSION" src/lib/meta/config.ts
```

- Hoy `v21.0` → subir a **v23.0 o superior** (v21 deprecia ~oct 2026).

- [ ] Actualizado
- [ ] Probado que no rompió ninguna llamada existente

### 1.4 🐛 Métricas de página deprecadas (BUG CONFIRMADO)

```bash
grep -n "metric" src/lib/meta/insights.ts
```

- `src/lib/meta/insights.ts:56` pide `page_impressions,page_post_engagements,page_fans`.
- Meta deprecó `page_impressions` y `page_fans` (nov-2025, eliminación total
  jun-2026). **La API devuelve error #100 "The value must be a valid insights
  metric"** — verificado a mano en el Graph API Explorer el 2026-08-12.
- Reemplazos: `page_impressions` → **`page_media_view`**;
  `page_fans` → **`page_follows`**; `page_post_engagements` sigue válida.
- Revisar también si se usan en otro lado: `page_impressions_unique` →
  `page_total_media_view_unique`, `post_impressions` → `post_media_view`.
- Revisar `src/components/metrics-dashboard.tsx` por si mapea los nombres viejos
  en la UI o en los tipos.

- [ ] Métricas corregidas
- [ ] La página `/metrics` muestra datos reales de la página de FB (no vacío ni error)

---

## 2. Env vars en producción (Vercel)

| Variable | Valor | OK |
|---|---|---|
| `META_LOGIN_CONFIG_ID` | `814070598398388` | [ ] |
| `META_OAUTH_REDIRECT_URI` | `https://app.heyloca.ai/api/integrations/meta/callback` | [ ] |
| `META_APP_ID` / `META_APP_SECRET` | ya cargadas — confirmar que son las de la app LOCA | [ ] |
| `META_TOKEN_ENCRYPTION_KEY` | cargada | [ ] |
| `LINKEDIN_CLIENT_ID` | `86y4sv6gesow5e` | [ ] |
| `LINKEDIN_CLIENT_SECRET` | sacarlo de la Auth tab de la app de LinkedIn (Alan ya es team member) | [ ] |
| `LINKEDIN_OAUTH_REDIRECT_URI` | `https://app.heyloca.ai/api/integrations/linkedin/callback` | [ ] |

⚠️ La redirect URI debe coincidir **carácter por carácter** con la registrada en
el dashboard de Meta: el OAuth valida por igualdad exacta de string.

---

## 3. Verificación end-to-end en producción

**Importante:** la app de Meta está **sin publicar**, así que solo cuentas de
Facebook con rol (admin / developer / **tester**) pueden conectar. Si probás con
una cuenta sin rol vas a ver un fallo que no es un bug. Agregate como tester en
el dashboard (Roles) antes de probar.

Hacerlo en **ventana de incógnito**, siguiendo el guion tal cual lo va a seguir
el revisor:

1. [ ] Login en `https://app.heyloca.ai/login` con la cuenta de prueba.
2. [ ] Menú izquierdo → **"Configuración"** → botón **"Conectar con Meta"** →
       se abre el diálogo de Facebook.
3. [ ] Otorgar una página + su cuenta de IG vinculada.
       **¿LOCA lista las páginas que administrás y te deja elegir una?** ← crítico
4. [ ] ¿Se muestra la cuenta de Instagram vinculada a esa página?
5. [ ] **"Estudio de contenidos"** → pestaña **"pendientes"** → **"Aprobar"** →
       pestaña **"aprobados"** → **"Publicar ahora"**.
       Hacerlo **dos veces**: una pieza con canal Instagram y otra con canal
       Facebook (el route publica a un solo destino según el canal —
       `src/app/api/integrations/meta/publish/route.ts:61`).
       ¿Aparecen los dos posts publicados de verdad en el feed de IG y en la
       página de FB? ¿Se muestra el link al post?
6. [ ] **"Métricas"** → ¿se ven datos reales de la página de Facebook y de
       Instagram? (sin el fix 1.4 esto falla)

---

## 4. Cuenta de prueba para el revisor de Meta

Crear una cuenta de LOCA en producción que el revisor pueda usar sin trabarse:

- [ ] Onboarding **completo** (negocio cargado, sin pasos pendientes)
- [ ] Estrategia **ya generada** (que no tenga que esperar generación)
- [ ] Contenido **pendiente de aprobación** en el Estudio de contenidos:
      **al menos 1 pieza de Instagram y 1 de Facebook**
- [ ] Sin paywall ni límites de uso de IA que lo bloqueen
- [ ] Probada en incógnito de punta a punta
- [ ] Email y password pasados a Sebastián

---

## 5. Labels de UI que NO pueden cambiar

Las instrucciones cargadas en Meta citan estos textos **literalmente**. Si alguno
cambia, hay que avisar a Sebastián para actualizar el texto en el dashboard:

- `Configuración`
- `Conectar con Meta`
- `Estudio de contenidos`
- pestañas `pendientes` / `aprobados`
- `Aprobar`
- `Publicar ahora`
- `Métricas`

- [ ] Confirmado que coinciden con producción

---

## 6. Rediseño de UI — decisión a tomar

El `CLAUDE.md` del repo dice que hay un **rediseño de UI en curso**. El screencast
que se manda a Meta muestra la UI actual y las instrucciones citan los labels de
arriba.

**Si el rediseño se deploya después de enviar la revisión, el revisor ve una app
distinta al video → rechazo.**

- [ ] Decidido: el rediseño entra **antes** de grabar el video final, **o** se
      congela hasta que Meta apruebe. (Definir con Sebastián.)

---

## 7. Qué reportar a Sebastián

- [ ] Resultado de cada uno de los 6 pasos del punto 3 (OK / qué error dio)
- [ ] Email y password de la cuenta de prueba
- [ ] Cualquier label de UI que haya cambiado
- [ ] Fecha estimada de deploy (de eso depende cuándo se graba el video y se envía)
- [ ] Si algo del guion puede confundir al revisor

---

## Anexo — qué NO tiene que tocar Alan

Todo el dashboard de Meta y LinkedIn lo maneja Sebastián: permisos, revisión,
webhooks, URLs. Alan solo necesita el `config_id` y las credenciales, que ya
están en este doc y en `INTEGRACIONES-META-IG-PENDIENTES.md`.

Pendientes posteriores (no bloquean el App Review de Meta):
- Módulo **Instagram Login** (`§2` del doc de integraciones) — para usuarios sin
  página de Facebook. Incluye el endpoint de webhook que Sebastián necesita para
  cerrar el paso 3 del wizard de Instagram.
- Módulo **LinkedIn** (`§5`) — esperando aprobación de la Community Management
  API; el esqueleto de OAuth se puede dejar armado desde ya.
