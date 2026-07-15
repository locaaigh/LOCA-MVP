"use client";

// Card de Settings para conectar Instagram/Facebook (OAuth de Meta).
// Solo muestra la vista pública de la conexión: los tokens nunca
// llegan al cliente.
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, useToast } from "@/components/ui";
import { Instagram, Link2, Unlink } from "lucide-react";

type MetaConnection = {
  businessId: string;
  pageId: string | null;
  pageName: string | null;
  igUserId: string | null;
  igUsername: string | null;
  status: "active" | "revoked" | "error";
  tokenExpiresAt: string | null;
  connectedAt: string;
};

export function MetaConnectionCard({
  businessId,
  isDemo,
}: {
  businessId: string;
  isDemo: boolean;
}) {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const { show, node } = useToast();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/integrations/meta/connection?businessId=${encodeURIComponent(businessId)}`
      );
      if (res.ok) {
        const json = (await res.json()) as { connection: MetaConnection | null };
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

  // Resultado del redirect post-OAuth (?meta=connected | cancelled | error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("meta");
    if (!result) return;
    if (result === "connected") show("Instagram y Facebook conectados ✨");
    else if (result === "cancelled") show("Conexión cancelada");
    else if (result === "not_configured") show("La integración con Meta no está configurada en el servidor");
    else show("No pudimos conectar con Meta. Probá de nuevo.");
    // Limpiar el query param sin recargar
    params.delete("meta");
    params.delete("reason");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [show]);

  const disconnect = async () => {
    if (!confirm("¿Desconectar Instagram y Facebook? Se borran los tokens de acceso guardados.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch(
        `/api/integrations/meta/connection?businessId=${encodeURIComponent(businessId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      setConnection(null);
      show("Cuentas desconectadas. Los tokens fueron eliminados.");
    } catch {
      show("No pudimos desconectar. Probá de nuevo.");
    } finally {
      setDisconnecting(false);
    }
  };

  const active = connection?.status === "active";

  return (
    <Card className="space-y-3">
      {node}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-loca-50 text-loca-600">
            <Instagram className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">Instagram y Facebook</h2>
        </div>
        {!loading && connection && (
          <Badge tone={active ? "lima" : "yellow"}>
            {active ? "Conectado" : connection.status === "revoked" ? "Revocado" : "Error"}
          </Badge>
        )}
      </div>

      {isDemo ? (
        <p className="text-sm text-zinc-500">
          En modo demo no se pueden conectar cuentas reales. Creá una cuenta para publicar en tus redes.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-400">Cargando…</p>
      ) : connection && active ? (
        <>
          <div className="space-y-1 text-sm text-zinc-600">
            {connection.pageName && (
              <p>
                Página de Facebook: <strong>{connection.pageName}</strong>
              </p>
            )}
            {connection.igUsername ? (
              <p>
                Instagram: <strong>@{connection.igUsername}</strong>
              </p>
            ) : (
              <p className="text-amber-700">
                Tu página no tiene una cuenta de Instagram Business vinculada.
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" loading={disconnecting} onClick={disconnect}>
            <Unlink className="h-3.5 w-3.5" /> Desconectar
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {connection?.status === "revoked"
              ? "Quitaste el acceso de LOCA desde Facebook. Volvé a conectar para seguir publicando."
              : "Conectá tu página de Facebook y tu Instagram Business para que LOCA pueda publicar tus contenidos."}
          </p>
          <Button
            size="lg"
            onClick={() => {
              window.location.href = `/api/integrations/meta/connect?businessId=${encodeURIComponent(businessId)}`;
            }}
          >
            <Link2 className="h-4 w-4" /> Conectar con Meta
          </Button>
        </>
      )}
    </Card>
  );
}
