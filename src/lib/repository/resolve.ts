import { NextRequest, NextResponse } from "next/server";
import { businessSchema, calendarItemSchema, contentItemSchema, strategySchema } from "@/lib/schemas";
import { getRepository } from "@/lib/repository/server-memory";
import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";

export function userIdFromRequest(req: NextRequest): string | null {
  return req.headers.get("x-loca-user-id");
}

type ResolveError = { error: string; status: number };

function fail(error: string, status: number): ResolveError {
  return { error, status };
}

export function requireUserId(req: NextRequest): string | ResolveError {
  const userId = userIdFromRequest(req);
  if (!userId) return fail("No autorizado", 401);
  return userId;
}

export function resolveBusiness(
  req: NextRequest,
  businessId: string
): { business: Business } | ResolveError {
  const userId = requireUserId(req);
  if (typeof userId !== "string") return userId;

  const repo = getRepository();
  const business = repo.getBusiness(userId, businessId);
  if (!business) return fail("Negocio no encontrado. Sincronizá tus datos.", 404);

  const parsed = businessSchema.safeParse(business);
  if (!parsed.success) return fail("Datos del negocio inválidos", 400);
  return { business: parsed.data as unknown as Business };
}

export function resolveStrategy(
  req: NextRequest,
  businessId: string
): { business: Business; strategy: Strategy } | ResolveError {
  const biz = resolveBusiness(req, businessId);
  if ("error" in biz) return biz;

  const userId = userIdFromRequest(req)!;
  const strategy = getRepository().getStrategy(userId, businessId);
  if (!strategy) return fail("Estrategia no encontrada. Generala primero.", 404);

  const parsed = strategySchema.safeParse(strategy);
  if (!parsed.success) return fail("Estrategia inválida", 400);
  return { business: biz.business, strategy: parsed.data as unknown as Strategy };
}

export function resolveCalendarItem(
  req: NextRequest,
  businessId: string,
  calendarItemId: string
): { business: Business; strategy: Strategy; calendarItem: CalendarItem } | ResolveError {
  const st = resolveStrategy(req, businessId);
  if ("error" in st) return st;

  const userId = userIdFromRequest(req)!;
  const calendarItem = getRepository().getCalendarItem(userId, businessId, calendarItemId);
  if (!calendarItem) return fail("Ítem de calendario no encontrado", 404);

  const parsed = calendarItemSchema.safeParse(calendarItem);
  if (!parsed.success) return fail("Calendario inválido", 400);
  return {
    business: st.business,
    strategy: st.strategy,
    calendarItem: parsed.data as unknown as CalendarItem,
  };
}

export function resolveContent(
  req: NextRequest,
  businessId: string,
  contentId: string
): { business: Business; content: ContentItem } | ResolveError {
  const biz = resolveBusiness(req, businessId);
  if ("error" in biz) return biz;

  const userId = userIdFromRequest(req)!;
  const content = getRepository().getContent(userId, businessId, contentId);
  if (!content) return fail("Contenido no encontrado", 404);

  const parsed = contentItemSchema.safeParse(content);
  if (!parsed.success) return fail("Contenido inválido", 400);
  return { business: biz.business, content: parsed.data as unknown as ContentItem };
}

export function jsonError(result: ResolveError) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
