import { NextRequest, NextResponse } from "next/server";
import { strategyAgent } from "@/lib/ai/agents";
import { resolveBusiness, jsonError } from "@/lib/repository/resolve";
import { isStrategyJobStale } from "@/lib/strategy-job-utils";
import { logAiUsage } from "@/lib/ai-usage";
import { logEvent } from "@/lib/events";
import type { Strategy } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, feedback } = (await req.json()) as {
      businessId: string;
      feedback?: string;
    };
    if (!businessId) return NextResponse.json({ error: "Falta businessId" }, { status: 400 });

    const resolved = await resolveBusiness(req, businessId);
    if ("error" in resolved) return jsonError(resolved);

    const { ctx, business } = resolved;

    if (
      business.strategyJob?.status === "generating" &&
      !isStrategyJobStale(business.strategyJob)
    ) {
      return NextResponse.json({ status: "generating" }, { status: 202 });
    }

    await ctx.repo.patchBusiness(ctx.userId, businessId, {
      strategyJob: { status: "generating", updatedAt: nowIso() },
    });
    const startedAt = Date.now();
    await logEvent({
      userId: ctx.userId,
      businessId,
      name: "strategy_generation_started",
      props: { hasFeedback: !!feedback },
      isAuthenticated: ctx.isAuthenticated,
    });

    try {
      const result = await strategyAgent.run({ business, feedback });
      const strategy: Strategy = { ...result.data, status: "pending_review" };
      await ctx.repo.upsertStrategy(ctx.userId, businessId, strategy);
      await ctx.repo.patchBusiness(ctx.userId, businessId, {
        strategyJob: { status: "completed", updatedAt: nowIso() },
        flowState: {
          strategy: "pending_review",
          calendar: business.flowState?.calendar ?? "draft",
          content: business.flowState?.content ?? "draft",
        },
      });
      await logAiUsage({ userId: ctx.userId, businessId, agent: "strategy", meta: result.meta });
      await logEvent({
        userId: ctx.userId,
        businessId,
        name: "strategy_generation_completed",
        props: {
          durationMs: Date.now() - startedAt,
          provider: result.meta.provider,
          isMock: result.meta.provider === "mock",
        },
        isAuthenticated: ctx.isAuthenticated,
      });
      return NextResponse.json({ status: "completed", strategy, meta: result.meta });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error generando estrategia";
      await ctx.repo.patchBusiness(ctx.userId, businessId, {
        strategyJob: { status: "failed", error: msg, updatedAt: nowIso() },
      });
      await logEvent({
        userId: ctx.userId,
        businessId,
        name: "strategy_generation_failed",
        props: { durationMs: Date.now() - startedAt, error: msg },
        isAuthenticated: ctx.isAuthenticated,
      });
      return NextResponse.json({ status: "failed", error: msg }, { status: 500 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error iniciando generación";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
