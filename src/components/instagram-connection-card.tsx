"use client";

// Card de Settings para conectar SOLO Instagram (Instagram Login), pensada
// para negocios con cuenta de IG profesional que no tienen página de Facebook.
// Es la alternativa: los que sí tienen página deben usar "Conectar con Meta".
// Los tokens nunca llegan al cliente: solo la vista pública de la conexión.
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, useToast } from "@/components/ui";
import { track } from "@/lib/analytics";
import { CheckCircle2, Link2, Unlink } from "lucide-react";
import { InstagramLogo } from "@/components/icons/BrandLogos";

type IgConnection = {
  businessId: string;
  accountId: string | null;
  accountName: string | null;
  igUserId: string | null;
  igUsername: string | null;
  status: "active" | "revoked" | "error";
  tokenExpiresAt: string | null;
  connectedAt: string;
};

export function InstagramConnectionCard({
  businessId,
  isDemo,
}: {
  businessId: string;
  isDemo: boolean;
}) {
  const [connection, setConnection] = useState<IgConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { show, node } = useToast();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/integrations/instagram/connection?businessId=${encodeURIComponent(businessId)}`
      );
      if (res.ok) {
        const json = (await res.json()) as { connection: IgConnection | null };
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

  // Resultado del redirect post-OAuth (?instagram=connected | cancelled | error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("instagram");
    if (!result) return;
    if (result === "connected") show("Instagram conectado ✨");
    else if (result === "cancelled") show("Conexión cancelada");
    else if (result === "not_configured") show("La integración con Instagram no está configurada en el servidor");
    else show("No pudimos conectar con Instagram. Probá de nuevo.");
    // Limpiar el query param sin recargar
    params.delete("instagram");
    params.delete("reason");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [show]);

  const disconnect = async () => {
    if (!confirm("¿Desconectar Instagram? Se borran los tokens de acceso guardados.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch(
        `/api/integrations/instagram/connection?businessId=${encodeURIComponent(businessId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      setConnection(null);
      show("Instagram desconectado. Los tokens fueron eliminados.");
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
          <InstagramLogo className="h-8 w-8 drop-shadow-sm" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">Solo Instagram</h2>
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
            {connection.igUsername ? (
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                Instagram: <strong>@{connection.igUsername}</strong>
              </p>
            ) : (
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                Cuenta de Instagram conectada.
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
              ? "Quitaste el acceso de LOCA desde Instagram. Volvé a conectar para seguir publicando."
              : "Elegí esta opción únicamente si no tenés página de Facebook. Requiere cuenta profesional (Business o Creator)."}
          </p>
          <Button
            variant="outline"
            size="lg"
            loading={connecting}
            onClick={() => {
              track("instagram_connect_clicked", { businessId });
              setConnecting(true);
              window.location.href = `/api/integrations/instagram/connect?businessId=${encodeURIComponent(businessId)}`;
            }}
          >
            <Link2 className="h-4 w-4" /> Conectar solo Instagram
          </Button>
        </>
      )}
    </Card>
  );
}
