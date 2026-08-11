import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

/**
 * Recepción de consultas del formulario de contacto (plan Enterprise / agencias).
 *
 * Valida, persiste el lead en la tabla leads (migración 0006), registra el
 * evento y, si CONTACT_WEBHOOK_URL está seteado (ej. webhook de Slack o
 * Zapier/Make), lo reenvía ahí.
 *
 * TODO (producción): enviar un email a soporte@heyloca.ai.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name || !email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const lead = {
    name,
    email,
    company: String(body.company ?? "").trim(),
    volume: String(body.volume ?? "").trim(),
    message: String(body.message ?? "").trim(),
    at: new Date().toISOString(),
  };

  // Log siempre (visible en los logs del server / Vercel).
  console.info("[contact] nuevo lead:", lead);

  // Persistir en Supabase: los leads no pueden vivir solo en logs.
  if (hasSupabaseAdminConfig()) {
    try {
      await getSupabaseAdmin().from("leads").insert({
        name: lead.name,
        email: lead.email,
        company: lead.company || null,
        volume: lead.volume || null,
        message: lead.message || null,
        source: "contact_form",
      });
    } catch (err) {
      console.error("[contact] no se pudo guardar el lead:", err);
    }
  }
  await logEvent({
    userId: null,
    name: "contact_lead_submitted",
    props: { company: lead.company || null, volume: lead.volume || null },
    isAuthenticated: false,
  });

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Nuevo lead LOCA — ${lead.name} (${lead.email}) · ${lead.company || "sin empresa"} · ${lead.volume || "sin volumen"}\n${lead.message}`,
        }),
      });
    } catch (err) {
      // No fallamos la respuesta al usuario si el webhook falla; ya quedó en logs.
      console.error("[contact] webhook error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
