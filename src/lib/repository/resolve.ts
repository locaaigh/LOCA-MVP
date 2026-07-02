import { NextRequest, NextResponse } from "next/server";
import { businessSchema, calendarItemSchema, contentItemSchema, strategySchema } from "@/lib/schemas";
import { getSessionUserId } from "@/lib/supabase/server";
import { repositoryFor, type RepoContext } from "./index";
import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";

type ResolveError = { error: string; status: number };

function fail(error: string, status: number): ResolveError {
  return { error, status };
}

/**
 * Identifica al usuario: primero por sesión de Supabase (auth real),
 * si no por header x-loca-user-id (modo demo, datos en memoria).
 */
export async function requireRepoContext(req: NextRequest): Promise<RepoContext | ResolveError> {
  const sessionUserId = await getSessionUserId();
  if (sessionUserId) {
    return { userId: sessionUserId, repo: repositoryFor(true), isAuthenticated: true };
  }
  const headerUserId = req.headers.get("x-loca-user-id");
  if (headerUserId) {
    return { userId: headerUserId, repo: repositoryFor(false), isAuthenticated: false };
  }
  return fail("No autorizado", 401);
}

export async function resolveBusiness(
  req: NextRequest,
  businessId: string
): Promise<{ ctx: RepoContext; business: Business } | ResolveError> {
  const ctx = await requireRepoContext(req);
  if ("error" in ctx) return ctx;

  const business = await ctx.repo.getBusiness(ctx.userId, businessId);
  if (!business) return fail("Negocio no encontrado. Sincronizá tus datos.", 404);

  const parsed = businessSchema.safeParse(business);
  if (!parsed.success) return fail("Datos del negocio inválidos", 400);
  return { ctx, business: parsed.data as unknown as Business };
}

export async function resolveStrategy(
  req: NextRequest,
  businessId: string
): Promise<{ ctx: RepoContext; business: Business; strategy: Strategy } | ResolveError> {
  const biz = await resolveBusiness(req, businessId);
  if ("error" in biz) return biz;

  const strategy = await biz.ctx.repo.getStrategy(biz.ctx.userId, businessId);
  if (!strategy) return fail("Estrategia no encontrada. Generala primero.", 404);

  const parsed = strategySchema.safeParse(strategy);
  if (!parsed.success) return fail("Estrategia inválida", 400);
  return { ctx: biz.ctx, business: biz.business, strategy: parsed.data as unknown as Strategy };
}

export async function resolveCalendarItem(
  req: NextRequest,
  businessId: string,
  calendarItemId: string
): Promise<
  | { ctx: RepoContext; business: Business; strategy: Strategy; calendarItem: CalendarItem }
  | ResolveError
> {
  const st = await resolveStrategy(req, businessId);
  if ("error" in st) return st;

  const calendarItem = await st.ctx.repo.getCalendarItem(st.ctx.userId, businessId, calendarItemId);
  if (!calendarItem) return fail("Ítem de calendario no encontrado", 404);

  const parsed = calendarItemSchema.safeParse(calendarItem);
  if (!parsed.success) return fail("Calendario inválido", 400);
  return {
    ctx: st.ctx,
    business: st.business,
    strategy: st.strategy,
    calendarItem: parsed.data as unknown as CalendarItem,
  };
}

export async function resolveContent(
  req: NextRequest,
  businessId: string,
  contentId: string
): Promise<{ ctx: RepoContext; business: Business; content: ContentItem } | ResolveError> {
  const biz = await resolveBusiness(req, businessId);
  if ("error" in biz) return biz;

  const content = await biz.ctx.repo.getContent(biz.ctx.userId, businessId, contentId);
  if (!content) return fail("Contenido no encontrado", 404);

  const parsed = contentItemSchema.safeParse(content);
  if (!parsed.success) return fail("Contenido inválido", 400);
  return { ctx: biz.ctx, business: biz.business, content: parsed.data as unknown as ContentItem };
}

export function jsonError(result: ResolveError) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
