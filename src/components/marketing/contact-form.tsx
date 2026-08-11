"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Field, Input, Textarea, Select } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/lib/marketing/config";

/** Formulario de contacto para el plan Enterprise / agencias. */
export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", volume: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="loca-card flex flex-col items-center px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-foreground">¡Gracias! Te vamos a escribir.</h2>
        <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
          Recibimos tu consulta y te contactamos a la brevedad a <strong>{form.email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="loca-card space-y-4 p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <Input value={form.name} onChange={set("name")} placeholder="Tu nombre" required />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set("email")} placeholder="vos@empresa.com" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa o agencia">
          <Input value={form.company} onChange={set("company")} placeholder="Nombre de tu empresa" />
        </Field>
        <Field label="¿Qué volumen necesitás?">
          <Select value={form.volume} onChange={set("volume")}>
            <option value="">Elegí una opción</option>
            <option value="20-50">20–50 contenidos por mes</option>
            <option value="50-100">50–100 contenidos por mes</option>
            <option value="100+">Más de 100 por mes</option>
            <option value="agencia">Soy agencia / varias marcas</option>
          </Select>
        </Field>
      </div>
      <Field label="Contanos qué necesitás">
        <Textarea
          value={form.message}
          onChange={set("message")}
          placeholder="Cantidad de marcas, redes, objetivos, plazos…"
          className="min-h-[120px]"
        />
      </Field>
      {status === "error" && (
        <p className="text-sm font-medium text-red-600 dark:text-red-300">
          No pudimos enviar tu consulta. Probá de nuevo o escribinos a {SUPPORT_EMAIL}.
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={status === "loading"}>
        {status === "loading" ? "Enviando…" : "Enviar consulta"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        O escribinos directo a{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-accent hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
    </form>
  );
}
