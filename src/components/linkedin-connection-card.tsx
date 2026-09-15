"use client";

// Card de Settings para conectar LinkedIn (Community Management API).
// Publica en la PÁGINA DE EMPRESA que administra el usuario que conecta.
// Los tokens nunca llegan al cliente: solo la vista pública de la conexión.
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, useToast } from "@/components/ui";
import { track } from "@/lib/analytics";
import { CheckCircle2, Link2, Unlink } from "lucide-react";
import { LinkedInLogo } from "@/components/icons/BrandLogos";

type LinkedInConnection = {
  businessId: string;
  accountId: string | null;
  accountName: string | null;
  status: "active" | "revoked" | "error";
  tokenExpiresAt: string | null;
  connectedAt: string;
};

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

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, isDemo]);

  // Resultado del redirect post-OAuth (?linkedin=connected | cancelled | error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("linkedin");
    if (!result) return;
    if (result === "connected") show("LinkedIn conectado ✨");
    else if (result === "cancelled") show("Conexión cancelada");
    else if (result === "not_configured") show("La integración con LinkedIn no está configurada en el servidor");
    else show("No pudimos conectar con LinkedIn. Probá de nuevo.");
    params.delete("linkedin");
    params.delete("reason");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [show]);

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
      show("LinkedIn desconectado. Los tokens fueron eliminados.");
    } catch {
      show("No pudimos desconectar. Probá de nuevo.");
    } finally {
      setDisconnecting(false);
    }
  };

  const active = connection?.status === "active";

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
                Necesitás ser administrador de una página para publicar.
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" loading={disconnecting} onClick={disconnect}>
            <Unlink className="h-3.5 w-3.5" /> Desconectar
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {connection?.status === "revoked"
              ? "Quitaste el acceso de LOCA en LinkedIn. Volvé a conectar para seguir publicando."
              : "Conectá LinkedIn para publicar en tu página de empresa. Tenés que ser administrador de la página."}
          </p>
          <Button
            variant="outline"
            size="lg"
            loading={connecting}
            onClick={() => {
              track("linkedin_connect_clicked", { businessId });
              setConnecting(true);
              window.location.href = `/api/integrations/linkedin/connect?businessId=${encodeURIComponent(businessId)}`;
            }}
          >
            <Link2 className="h-4 w-4" /> Conectar LinkedIn
          </Button>
        </>
      )}
    </Card>
  );
}
