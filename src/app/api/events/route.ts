import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase/server";
import { isMirroredClientEvent } from "@/lib/analytics-events";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROPS_BYTES = 4_000;

/**
 * Recibe eventos de producto del cliente y los espeja en la tabla events.
 * Solo acepta nombres del catálogo MIRRORED_CLIENT_EVENTS (el resto del
 * comportamiento fino vive únicamente en PostHog). Best-effort: siempre
 * responde 204 salvo payload inválido — telemetría nunca rompe la UX.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      businessId?: string;
      props?: Record<string, unknown>;
    };
    if (!body?.name || !isMirroredClientEvent(body.name)) {
      return NextResponse.json({ error: "Evento desconocido" }, { status: 400 });
    }
    const props = body.props ?? {};
    if (JSON.stringify(props).length > MAX_PROPS_BYTES) {
      return NextResponse.json({ error: "Props demasiado grandes" }, { status: 400 });
    }

    // Identidad: sesión Supabase = tráfico real; sin sesión (demo /
    // onboarding anónimo) igual se registra, marcado como no autenticado.
    const sessionUserId = await getSessionUserId();
    await logEvent({
      userId: sessionUserId,
      businessId: typeof body.businessId === "string" ? body.businessId : null,
      name: body.name,
      props,
      isAuthenticated: !!sessionUserId,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
