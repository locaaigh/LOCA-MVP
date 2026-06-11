"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AiStatusBadge, useAiStatus } from "@/components/ai-status";
import { Badge, Button, Card, Field, Input, PageHeader, useToast } from "@/components/ui";
import { Trash2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const business = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId) || null);
  const businesses = useStore((s) => s.businesses);
  const upsertBusiness = useStore((s) => s.upsertBusiness);
  const deleteBusiness = useStore((s) => s.deleteBusiness);
  const resetAll = useStore((s) => s.resetAll);
  const status = useAiStatus();
  const { show, node } = useToast();

  return (
    <div className="space-y-5">
      {node}
      <PageHeader title="Configuración" subtitle="Tu cuenta, la IA y tus negocios." />


      <Card className="space-y-2">
        <h2 className="font-semibold">Cuenta</h2>
        <p className="text-sm text-zinc-500">{user?.email} {user?.isDemo && <Badge tone="yellow">Demo</Badge>}</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Generación con IA</h2>
          <AiStatusBadge />
        </div>
        {status?.hasOpenAI ? (
          <p className="text-sm text-emerald-600">
            Tu API key está configurada. Eva genera textos e imágenes reales.
          </p>
        ) : (
          <div className="space-y-2 text-sm text-zinc-600">
            <p>
              Estás en <strong>modo demo</strong>: Eva usa contenidos mock inteligentes y placeholders de marca.
              La app funciona completa igual.
            </p>
            <p>Para activar IA real, agregá tu clave en un archivo <code className="rounded bg-zinc-100 px-1">.env.local</code>:</p>
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">OPENAI_API_KEY=sk-...</pre>
            <p className="text-xs text-zinc-400">Reiniciá el servidor (<code>npm run dev</code>) después de agregarla.</p>
          </div>
        )}
      </Card>

      {business && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Negocio activo</h2>
          <Field label="Nombre">
            <Input value={business.name} onChange={(e) => upsertBusiness({ ...business, name: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="País">
              <Input value={business.country} onChange={(e) => upsertBusiness({ ...business, country: e.target.value })} />
            </Field>
            <Field label="Ciudad">
              <Input value={business.city} onChange={(e) => upsertBusiness({ ...business, city: e.target.value })} />
            </Field>
            <Field label="Color de marca">
              <input
                type="color"
                value={business.brandColors[0] || "#ec4899"}
                onChange={(e) =>
                  upsertBusiness({ ...business, brandColors: [e.target.value, ...business.brandColors.slice(1)] })
                }
                className="h-10 w-full rounded-lg border border-zinc-300"
              />
            </Field>
          </div>
          <Link href="/onboarding" className="text-sm font-medium text-loca-600 hover:underline">
            Editar onboarding completo →
          </Link>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="font-semibold">Tus negocios</h2>
        {businesses.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-sm">
            <span>{b.name} {b.isDemo && <Badge tone="yellow">demo</Badge>}</span>
            <button
              onClick={() => {
                deleteBusiness(b.id);
                show("Negocio eliminado");
              }}
              className="text-zinc-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {businesses.length === 0 && <p className="text-sm text-zinc-400">No tenés negocios.</p>}
      </Card>

      <Card className="space-y-3 border-red-200">
        <h2 className="font-semibold text-red-600">Zona de peligro</h2>
        <p className="text-sm text-zinc-500">Borra todos los datos locales (negocios, estrategias, contenidos).</p>
        <Button
          variant="danger"
          onClick={() => {
            resetAll();
            router.replace("/login");
          }}
        >
          Borrar todo y cerrar sesión
        </Button>
      </Card>
    </div>
  );
}
