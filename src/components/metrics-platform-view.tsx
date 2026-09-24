"use client";

// Vista de una plataforma en /metrics: KPIs de cuenta + lista de posts, con
// estados (ok / permiso pendiente / error / próximamente / sin actividad).
import * as React from "react";
import { Badge, Button, Card, SectionLabel } from "@/components/ui";
import { PlatformLogo } from "@/components/platform-logo";
import type { PlatformMetrics } from "@/lib/metrics/types";
import { Users, Eye, TrendingUp, Heart, ExternalLink, Link2, AlertTriangle, Clock } from "lucide-react";

function fmt(n?: number): string {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export function MetricsPlatformView({ data }: { data: PlatformMetrics }) {
  const label = PLATFORM_LABEL[data.platform] || data.platform;

  if (data.status === "permission_error") {
    return (
      <StateCard
        icon={<AlertTriangle className="h-7 w-7" />}
        tone="amber"
        title={`Falta un permiso para ver ${label}`}
        body="El acceso a estas métricas está pendiente de aprobación o el token no lo incluye. Reconectá tus redes desde Configuración; si el permiso sigue pendiente, va a habilitarse cuando se apruebe."
        detail={data.error}
        cta
      />
    );
  }

  if (data.status === "error") {
    return (
      <StateCard
        icon={<AlertTriangle className="h-7 w-7" />}
        tone="amber"
        title={`No pudimos traer las métricas de ${label}`}
        body="Hubo un problema al consultar la API. Probá de nuevo en un rato."
        detail={data.error}
      />
    );
  }

  if (data.status === "coming_soon") {
    return (
      <StateCard
        icon={<Clock className="h-7 w-7" />}
        tone="muted"
        title={`Métricas de ${label} — próximamente`}
        body="La conexión ya está activa. Estamos preparando las métricas de LinkedIn."
      />
    );
  }

  const a = data.account;
  const hasAccount =
    a.followers != null ||
    a.views != null ||
    a.reach != null ||
    a.interactions != null ||
    a.profileViews != null ||
    a.postsCount != null;

  if (!hasAccount && data.posts.length === 0) {
    return (
      <StateCard
        icon={<PlatformLogo channel={label} size={26} />}
        tone="muted"
        title="Todavía no hay actividad"
        body={`Cuando ${label} registre alcance o publicaciones en el período, vas a verlo acá.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {data.accountName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PlatformLogo channel={label} size={22} />
          <span className="font-semibold text-foreground-muted">{data.accountName}</span>
        </div>
      )}

      {/* KPIs de cuenta */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi icon={Users} label="Seguidores" value={fmt(a.followers)} />
        <Kpi icon={Eye} label="Vistas" value={fmt(a.views)} />
        <Kpi icon={TrendingUp} label="Alcance" value={fmt(a.reach)} />
        <Kpi icon={Heart} label="Interacciones" value={fmt(a.interactions)} highlight />
        {a.profileViews != null && (
          <Kpi icon={Eye} label="Visitas al perfil" value={fmt(a.profileViews)} />
        )}
        {a.postsCount != null && (
          <Kpi icon={TrendingUp} label="Publicaciones" value={fmt(a.postsCount)} />
        )}
      </div>

      {/* Posts del período */}
      {data.posts.length > 0 && (
        <Card>
          <SectionLabel>Publicaciones del período</SectionLabel>
          <div className="mt-4 space-y-2.5">
            {data.posts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 px-4 py-3 text-sm transition hover:border-loca-200 hover:bg-accent-subtle-bg/40"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {p.publishedFromLoca && <Badge tone="pink">LOCA</Badge>}
                  <span className="truncate font-semibold text-foreground-soft">
                    {p.caption?.trim() || "Publicación"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span title="Vistas">{fmt(p.metrics.views ?? p.metrics.reach)} 👁</span>
                  <span title="Me gusta">{fmt(p.metrics.likes)} ❤</span>
                  <span title="Comentarios">{fmt(p.metrics.comments)} 💬</span>
                  {p.permalink && (
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-5 transition hover:shadow-pop ${highlight ? "ring-1 ring-accent-subtle-ring" : ""}`}>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          highlight ? "bg-loca-100 dark:bg-accent-subtle-bg text-accent" : "bg-accent-subtle-bg text-loca-500"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className={`mt-4 text-3xl font-bold tracking-tight ${highlight ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </Card>
  );
}

function StateCard({
  icon,
  tone,
  title,
  body,
  detail,
  cta,
}: {
  icon: React.ReactNode;
  tone: "amber" | "muted";
  title: string;
  body: string;
  detail?: string;
  cta?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const toneCls =
    tone === "amber"
      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
      : "bg-surface-muted text-muted-foreground";
  return (
    <Card className="flex flex-col items-center gap-4 py-12 text-center">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${toneCls}`}>{icon}</div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{body}</p>
        {detail && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mx-auto mt-1 block text-xs text-faint underline"
          >
            {open ? "Ocultar detalle técnico" : "Ver detalle técnico"}
          </button>
        )}
        {detail && open && (
          <p className="mx-auto max-w-md break-words pt-1 text-xs text-faint">{detail}</p>
        )}
      </div>
      {cta && (
        <Button size="lg" variant="outline" onClick={() => (window.location.href = "/settings")}>
          <Link2 className="h-4 w-4" /> Ir a Configuración
        </Button>
      )}
    </Card>
  );
}
