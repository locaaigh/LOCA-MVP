"use client";

// Card de Settings para conectar LinkedIn (Community Management API).
// Publica en la PÁGINA DE EMPRESA que administra el usuario que conecta.
// Los tokens nunca llegan al cliente: solo la vista pública de la conexión.
//
// Qué resuelve esta versión:
// - El callback vuelve con ?linkedin=error&reason=…: el motivo se MUESTRA en
//   la card (antes se descartaba y solo salía un toast genérico).
// - Si el usuario administra varias páginas, puede elegir cuál (antes se
//   tomaba la primera sin avisar).
// - Aviso cuando el token está por vencer o la conexión quedó en error.
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Select, useToast } from "@/components/ui";
import { track } from "@/lib/analytics";
import { AlertTriangle, CheckCircle2, Link2, RefreshCw, Unlink } from "lucide-react";
import { LinkedInLogo } from "@/components/icons/BrandLogos";

type LinkedInConnection = {
  businessId: string;
  accountId: string | null;
  accountName: string | null;
  status: "active" | "revoked" | "error";
  tokenExpiresAt: string | null;
  connectedAt: string;
};

type LinkedInOrg = { id: string; name: string };

/** Traduce el `reason` técnico del callback a algo accionable para el usuario. */
function explainReason(reason: string | null): string {
  const r = (reason || "").toLowerCase();
  if (!r) return "No pudimos conectar con LinkedIn. Probá de nuevo.";
  if (r.includes("unauthorized_scope")) {
    return "LinkedIn no tiene habilitados los permisos que pide LOCA (la app todavía no tiene aprobada la Community Management API para ese permiso).";
  }
  if (r.includes("redirect_uri")) {
    return "La URL de retorno no coincide con la registrada en LinkedIn. Es un problema de configuración del servidor, no tuyo.";
  }
  if (r.includes("versión de api") || r.includes("426") || r.includes("not active")) {
    return "LinkedIn dejó de aceptar la versión de API que usa LOCA. Es un problema de configuración del servidor, no tuyo.";
  }
  if (r.includes("invalid_state")) {
    return "La sesión de conexión venció o fue alterada. Volvé a intentar desde este botón.";
  }
  if (r.includes("token") && (r.includes("venció") || r.includes("expired") || r.includes("revocado"))) {
    return "El acceso a LinkedIn venció. Volvé a conectar.";
  }
  return `LinkedIn respondió: ${reason}`;
}

export function LinkedInConnectionCard({
  businessId,
  isDemo,
}: {
  businessId: string;
  isDemo: boolean;
}) {
  const [connection, setConnection] = useState<LinkedInConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  // Selector de página (a demanda: cada listado consume cupo de la API).
  const [orgs, setOrgs] = useState<LinkedInOrg[] | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const { show, node } = useToast();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/integrations/linkedin/connection?businessId=${encodeURIComponent(businessId)}`
      );
      if (res.ok) {
        const json = (await res.json()) as { connection: LinkedInConnection | null };
        setConnection(json.connection);
      }
    } catch {
      // sin conexión al server: se muestra como no conectado
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const loadOrgs = useCallback(async () => {
    setOrgsLoading(true);
    try {
      const res = await fetch(
        `/api/integrations/linkedin/organizations?businessId=${encodeURIComponent(businessId)}`
      );
      const json = (await res.json()) as { organizations?: LinkedInOrg[]; error?: string };
      if (!res.ok) throw new Error(json.error || "No pudimos listar tus páginas");
      setOrgs(json.organizations ?? []);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "No pudimos listar tus páginas de LinkedIn");
      setOrgs(null);
    } finally {
      setOrgsLoading(false);
    }
  }, [businessId, show]);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, isDemo]);

  // Resultado del redirect post-OAuth (?linkedin=connected&pages=N | cancelled | error&reason=…)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("linkedin");
    if (!result) return;
    const reason = params.get("reason");
    const pages = Number(params.get("pages") || "0");
    if (result === "connected") {
      show("LinkedIn conectado ✨");
      setLastError(null);
      // Administra varias páginas: abrimos el selector para que elija.
      if (pages > 1) loadOrgs();
    } else if (result === "cancelled") {
      show("Conexión cancelada");
    } else if (result === "not_configured") {
      setLastError("La integración con LinkedIn no está configurada en el servidor.");
    } else if (result === "missing_business") {
      setLastError("No encontramos el negocio a conectar. Recargá la página y probá de nuevo.");
    } else {
      setLastError(explainReason(reason));
    }
    params.delete("linkedin");
    params.delete("reason");
    params.delete("pages");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [show, loadOrgs]);

  const disconnect = async () => {
    if (!confirm("¿Desconectar LinkedIn? Se borran los tokens de acceso guardados.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch(
        `/api/integrations/linkedin/connection?businessId=${encodeURIComponent(businessId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      setConnection(null);
      setOrgs(null);
      show("LinkedIn desconectado. Los tokens fueron eliminados.");
    } catch {
      show("No pudimos desconectar. Probá de nuevo.");
    } finally {
      setDisconnecting(false);
    }
  };

  const choosePage = async (accountId: string) => {
    if (!accountId || accountId === connection?.accountId) return;
    setSavingOrg(true);
    try {
      const res = await fetch(`/api/integrations/linkedin/connection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, accountId }),
      });
      const json = (await res.json()) as { connection?: LinkedInConnection; error?: string };
      if (!res.ok || !json.connection) throw new Error(json.error || "No pudimos cambiar la página");
      setConnection(json.connection);
      setOrgs(null);
      show(`Vas a publicar en ${json.connection.accountName}`);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "No pudimos cambiar la página");
    } finally {
      setSavingOrg(false);
    }
  };

  const connect = () => {
    track("linkedin_connect_clicked", { businessId });
    setConnecting(true);
    setLastError(null);
    window.location.href = `/api/integrations/linkedin/connect?businessId=${encodeURIComponent(businessId)}`;
  };

  const active = connection?.status === "active";
  const expiresAt = connection?.tokenExpiresAt ? new Date(connection.tokenExpiresAt) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000) : null;
  const expiringSoon = daysLeft !== null && daysLeft <= 7;

  return (
    <Card className="space-y-4">
      {node}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <LinkedInLogo className="h-8 w-8 drop-shadow-sm" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">LinkedIn</h2>
        </div>
        {!loading && connection && (
          <Badge tone={active ? "lima" : "yellow"}>
            {active ? "Conectado" : connection.status === "revoked" ? "Revocado" : "Error"}
          </Badge>
        )}
      </div>

      {lastError && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words">{lastError}</p>
        </div>
      )}

      {isDemo ? (
        <p className="text-sm text-muted-foreground">
          En modo demo no se pueden conectar cuentas reales. Creá una cuenta para publicar en tus redes.
        </p>
      ) : loading ? (
        <p className="text-sm text-faint">Cargando…</p>
      ) : connection && active ? (
        <>
          <div className="space-y-1.5 text-sm text-muted-foreground-2">
            {connection.accountName ? (
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                Página: <strong>{connection.accountName}</strong>
              </p>
            ) : (
              <p className="text-amber-700 dark:text-amber-300">
                Conectaste LinkedIn pero no encontramos una página de empresa que administres.
                Necesitás ser <strong>administrador</strong> (no solo editor) de una página para publicar.
                Si te dieron el rol hace poco, tocá “Cambiar página” para volver a buscar.
              </p>
            )}
            {expiringSoon && (
              <p className="text-amber-700 dark:text-amber-300">
                El acceso vence {daysLeft !== null && daysLeft > 0 ? `en ${daysLeft} día${daysLeft === 1 ? "" : "s"}` : "hoy"}.
                Si la renovación automática falla, volvé a conectar.
              </p>
            )}
          </div>

          {orgs && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                {orgs.length === 0
                  ? "LinkedIn no devolvió páginas donde seas administrador."
                  : "¿En qué página publica LOCA?"}
              </label>
              {orgs.length > 0 && (
                <Select
                  value={connection.accountId ?? ""}
                  disabled={savingOrg}
                  onChange={(e) => choosePage(e.target.value)}
                >
                  {!connection.accountId && <option value="">Elegí una página…</option>}
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={orgsLoading}
              onClick={() => (orgs ? setOrgs(null) : loadOrgs())}
            >
              <RefreshCw className="h-3.5 w-3.5" /> {orgs ? "Cerrar" : connection.accountId ? "Cambiar página" : "Buscar páginas"}
            </Button>
            <Button variant="outline" size="sm" loading={disconnecting} onClick={disconnect}>
              <Unlink className="h-3.5 w-3.5" /> Desconectar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {connection?.status === "revoked"
              ? "Quitaste el acceso de LOCA en LinkedIn. Volvé a conectar para seguir publicando."
              : connection?.status === "error"
                ? "No pudimos renovar el acceso a LinkedIn. Volvé a conectar para seguir publicando."
                : "Conectá LinkedIn para publicar en tu página de empresa. Tenés que ser administrador de la página."}
          </p>
          <Button variant="outline" size="lg" loading={connecting} onClick={connect}>
            <Link2 className="h-4 w-4" /> {connection ? "Volver a conectar LinkedIn" : "Conectar LinkedIn"}
          </Button>
        </>
      )}
    </Card>
  );
}
