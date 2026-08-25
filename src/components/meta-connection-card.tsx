"use client";

// Card de Settings para conectar Facebook + Instagram (OAuth de Meta).
// Opción recomendada: cubre página de FB e IG Business en un solo login.
// Solo muestra la vista pública de la conexión: los tokens nunca llegan
// al cliente.
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, useToast } from "@/components/ui";
import { track } from "@/lib/analytics";
import { CheckCircle2, Link2, Unlink } from "lucide-react";
import { FacebookLogo, InstagramLogo } from "@/components/icons/BrandLogos";

type MetaConnection = {
  businessId: string;
  accountId: string | null;
  accountName: string | null;
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
  const [connecting, setConnecting] = useState(false);
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
    if (result === "connected") show("Facebook e Instagram conectados ✨");
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
    if (!confirm("¿Desconectar Facebook e Instagram? Se borran los tokens de acceso guardados.")) return;
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
    // Opción recomendada: ring de acento sutil para destacarla sobre la de
    // "Solo Instagram", sin romper el design system.
    <Card className="space-y-4 ring-1 ring-accent-subtle-ring">
      {node}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <FacebookLogo className="h-8 w-8 drop-shadow-sm" />
            <InstagramLogo className="-ml-2 h-8 w-8 drop-shadow-sm" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Facebook + Instagram</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone="pink">Recomendado</Badge>
          {!loading && connection && (
            <Badge tone={active ? "lima" : "yellow"}>
              {active ? "Conectado" : connection.status === "revoked" ? "Revocado" : "Error"}
            </Badge>
          )}
        </div>
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
                Página de Facebook: <strong>{connection.accountName}</strong>
              </p>
            ) : (
              // Conectó con Meta pero su cuenta no administra ninguna página de
              // Facebook: sin página no se puede publicar por este flujo.
              <p className="text-amber-700 dark:text-amber-300">
                Tu cuenta de Facebook no administra ninguna página. Para publicar
                necesitás una página de Facebook, o conectá tu Instagram
                directamente con la opción <strong>“Solo Instagram”</strong> de abajo.
              </p>
            )}
            {connection.accountName &&
              (connection.igUsername ? (
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  Instagram: <strong>@{connection.igUsername}</strong>
                </p>
              ) : (
                <p className="text-amber-700 dark:text-amber-300">
                  Tu página no tiene una cuenta de Instagram Business vinculada.
                </p>
              ))}
          </div>
          <Button variant="outline" size="sm" loading={disconnecting} onClick={disconnect}>
            <Unlink className="h-3.5 w-3.5" /> Desconectar
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {connection?.status === "revoked"
              ? "Quitaste el acceso de LOCA desde Facebook. Volvé a conectar para seguir publicando."
              : "La opción más común. Conectá tu página de Facebook y tu cuenta de Instagram Business en un solo paso."}
          </p>
          <Button
            size="lg"
            loading={connecting}
            onClick={() => {
              track("meta_connect_clicked", { businessId });
              setConnecting(true);
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
