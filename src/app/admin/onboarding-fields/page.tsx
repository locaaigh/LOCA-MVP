"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { ArrowDown, ArrowUp, Lock, Pencil, RotateCcw, ShieldAlert } from "lucide-react";

interface AdminField {
  fieldId: string;
  section: string;
  floor: boolean;
  defaultRequired: boolean;
  defaultCritical: boolean;
  required: boolean;
  critical: boolean;
  label: string;
  placeholder: string;
  why: string;
  defaultLabel: string;
  defaultPlaceholder: string;
  defaultWhy: string;
  sortKey: number;
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
  // Editor de textos del campo (label / ayuda / placeholder).
  const [editing, setEditing] = useState<AdminField | null>(null);
  const [draft, setDraft] = useState({ label: "", why: "", placeholder: "" });

  async function reload() {
    const res = await fetch("/api/admin/field-config");
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    setFields(json.fields);
  }

  useEffect(() => {
    reload().catch(() => show("No se pudo cargar la configuración."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(() => {
    const map = new Map<string, AdminField[]>();
    for (const f of fields ?? []) map.set(f.section, [...(map.get(f.section) ?? []), f]);
    return [...map.entries()];
  }, [fields]);

  async function patch(fieldId: string, body: Record<string, unknown>, silent = false) {
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
      if (!silent) {
        await reload();
        show("Guardado ✓");
      }
    } catch (e) {
      setFields(prev);
      show(e instanceof Error ? e.message : "Error guardando");
      throw e;
    } finally {
      setSaving(null);
    }
  }

  function toggleRequired(f: AdminField) {
    if (f.critical && f.required) {
      show("Un campo crítico no puede ser opcional: primero desactivá 'Crítico'.");
      return;
    }
    void patch(f.fieldId, { required: !f.required }).catch(() => {});
  }

  function toggleCritical(f: AdminField) {
    if (f.critical) {
      setConfirm(f); // apagar un crítico pide confirmación
      return;
    }
    void patch(f.fieldId, { critical: true }).catch(() => {});
  }

  // Mover un campo dentro de su sección: se intercambian las claves de orden
  // de los dos campos (dos PATCH silenciosos + una recarga).
  async function move(f: AdminField, dir: -1 | 1) {
    const inSection = sections.find(([s]) => s === f.section)?.[1] ?? [];
    const idx = inSection.findIndex((x) => x.fieldId === f.fieldId);
    const other = inSection[idx + dir];
    if (!other) return;
    try {
      await patch(f.fieldId, { sortOrder: other.sortKey }, true);
      await patch(other.fieldId, { sortOrder: f.sortKey }, true);
      await reload();
      show("Orden actualizado ✓");
    } catch {
      /* el toast de error ya salió en patch() */
    }
  }

  function openEditor(f: AdminField) {
    setDraft({ label: f.label, why: f.why, placeholder: f.placeholder });
    setEditing(f);
  }

  async function saveTexts() {
    if (!editing) return;
    // "" = volver al default de ese texto (la API lo guarda como null).
    await patch(editing.fieldId, {
      label: draft.label.trim() === editing.defaultLabel ? "" : draft.label,
      why: draft.why.trim() === editing.defaultWhy ? "" : draft.why,
      placeholder: draft.placeholder.trim() === editing.defaultPlaceholder ? "" : draft.placeholder,
    }).catch(() => {});
    setEditing(null);
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
          onboarding. <strong>Crítico</strong>: además bloquea la generación de la estrategia. Con
          las flechas cambiás el orden y con el lápiz editás los textos. Los cambios impactan sin
          deploy (puede demorar hasta 5 minutos por caché).
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
            {fs.map((f, i) => (
              <div
                key={f.fieldId}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-5 py-3 last:border-b-0"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => void move(f, -1)}
                    disabled={i === 0 || saving !== null}
                    className="rounded p-0.5 text-faint transition hover:text-foreground disabled:opacity-25"
                    title="Subir"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void move(f, 1)}
                    disabled={i === fs.length - 1 || saving !== null}
                    className="rounded p-0.5 text-faint transition hover:text-foreground disabled:opacity-25"
                    title="Bajar"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{f.label}</p>
                    <button
                      onClick={() => openEditor(f)}
                      className="rounded p-0.5 text-faint transition hover:text-foreground"
                      title="Editar textos (nombre, ayuda, placeholder)"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
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
                        onClick={() => void patch(f.fieldId, { reset: true }).catch(() => {})}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-faint transition hover:text-foreground-muted"
                        title={`Default: "${f.defaultLabel}" · ${f.defaultRequired ? "obligatorio" : "opcional"}${f.defaultCritical ? " + crítico" : ""}`}
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
                  void patch(confirm.fieldId, { critical: false }).catch(() => {});
                  setConfirm(null);
                }}
              >
                Sí, desactivar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar textos del campo">
        {editing && (
          <div className="space-y-4">
            <Field label="Nombre del campo (label)">
              <Input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder={editing.defaultLabel}
              />
            </Field>
            <Field label="Ayuda (por qué se pide)">
              <Textarea
                rows={2}
                value={draft.why}
                onChange={(e) => setDraft({ ...draft, why: e.target.value })}
                placeholder={editing.defaultWhy}
              />
            </Field>
            <Field label="Placeholder del input">
              <Input
                value={draft.placeholder}
                onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
                placeholder={editing.defaultPlaceholder || "(sin placeholder)"}
              />
            </Field>
            <p className="text-xs text-faint">
              Dejá un texto igual al default (o vacío) para volver al texto original. Aplica al
              flujo &quot;Completá lo que falta&quot; y a los avisos de datos faltantes; el
              formulario manual mantiene sus propios textos por ahora.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button onClick={() => void saveTexts()} disabled={saving !== null}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
