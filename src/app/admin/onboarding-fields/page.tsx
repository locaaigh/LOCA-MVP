"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, useToast } from "@/components/ui";
import { Lock, RotateCcw, ShieldAlert } from "lucide-react";

interface AdminField {
  fieldId: string;
  label: string;
  section: string;
  floor: boolean;
  defaultRequired: boolean;
  defaultCritical: boolean;
  required: boolean;
  critical: boolean;
  overridden: boolean;
  updatedByEmail: string | null;
  updatedAt: string | null;
}

function Toggle({
  on,
  disabled,
  onChange,
  title,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? "bg-loca-500" : "bg-surface-muted"
      } ${disabled ? "cursor-not-allowed opacity-45" : "hover:opacity-90"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function OnboardingFieldsAdminPage() {
  const { show, node } = useToast();
  const [fields, setFields] = useState<AdminField[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  // Confirmación antes de apagar un crítico (efecto real sobre la estrategia).
  const [confirm, setConfirm] = useState<AdminField | null>(null);

  useEffect(() => {
    fetch("/api/admin/field-config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => setFields(json.fields))
      .catch(() => show("No se pudo cargar la configuración."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(() => {
    const map = new Map<string, AdminField[]>();
    for (const f of fields ?? []) map.set(f.section, [...(map.get(f.section) ?? []), f]);
    return [...map.entries()];
  }, [fields]);

  async function patch(fieldId: string, body: Record<string, unknown>) {
    setSaving(fieldId);
    const prev = fields;
    try {
      const res = await fetch("/api/admin/field-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error guardando");
      // Releer para traer auditoría fresca (quién/cuándo).
      const updated = await fetch("/api/admin/field-config").then((r) => r.json());
      setFields(updated.fields);
      show("Guardado ✓");
    } catch (e) {
      setFields(prev);
      show(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setSaving(null);
    }
  }

  function toggleRequired(f: AdminField) {
    if (f.critical && f.required) {
      show("Un campo crítico no puede ser opcional: primero desactivá 'Crítico'.");
      return;
    }
    void patch(f.fieldId, { required: !f.required });
  }

  function toggleCritical(f: AdminField) {
    if (f.critical) {
      setConfirm(f); // apagar un crítico pide confirmación
      return;
    }
    void patch(f.fieldId, { critical: true });
  }

  return (
    <div className="space-y-6">
      {node}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Campos del onboarding
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          <strong>Obligatorio</strong>: se pide en &quot;Completá lo que falta&quot; al terminar el
          onboarding. <strong>Crítico</strong>: además bloquea la generación de la estrategia.
          Los cambios impactan sin deploy (puede demorar hasta 5 minutos por caché).
        </p>
      </div>

      {!fields ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">Cargando…</Card>
      ) : (
        sections.map(([section, fs]) => (
          <Card key={section} className="space-y-1 p-0">
            <h2 className="border-b border-border px-5 py-3 text-xs font-bold uppercase tracking-wider text-accent">
              {section}
            </h2>
            {fs.map((f) => (
              <div
                key={f.fieldId}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-5 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{f.label}</p>
                    {f.floor && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground"
                        title="Piso mínimo: sin este dato la estrategia sería de otro negocio."
                      >
                        <Lock className="h-3 w-3" /> Fijo
                      </span>
                    )}
                    {f.overridden && (
                      <button
                        onClick={() => void patch(f.fieldId, { reset: true })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-faint transition hover:text-foreground-muted"
                        title={`Default: ${f.defaultRequired ? "obligatorio" : "opcional"}${f.defaultCritical ? " + crítico" : ""}`}
                      >
                        <RotateCcw className="h-3 w-3" /> Restaurar default
                      </button>
                    )}
                  </div>
                  {f.overridden && f.updatedByEmail && (
                    <p className="mt-0.5 text-[11px] text-faint">
                      Cambiado por {f.updatedByEmail}
                      {f.updatedAt ? ` · ${new Date(f.updatedAt).toLocaleDateString("es-AR")}` : ""}
                    </p>
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground-soft">
                  Obligatorio
                  <Toggle
                    on={f.required}
                    disabled={f.floor || saving === f.fieldId || (f.critical && f.required)}
                    title={
                      f.critical && f.required
                        ? "Un campo crítico no puede ser opcional: primero desactivá 'Crítico'."
                        : undefined
                    }
                    onChange={() => toggleRequired(f)}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground-soft">
                  Crítico
                  <Toggle
                    on={f.critical}
                    disabled={f.floor || saving === f.fieldId}
                    onChange={() => toggleCritical(f)}
                  />
                </label>
              </div>
            ))}
          </Card>
        ))
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Desactivar crítico">
        {confirm && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Eva va a poder <strong>generar la estrategia aunque &quot;{confirm.label}&quot; esté
                vacío</strong>. Nada se rompe, pero la calidad del resultado puede bajar. El cambio
                queda registrado a tu nombre.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  void patch(confirm.fieldId, { critical: false });
                  setConfirm(null);
                }}
              >
                Sí, desactivar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
