"use client";

import { locaUserHeaders, syncRepositoryToServer } from "@/lib/repository/client-sync";
import { isStrategyJobStale } from "@/lib/strategy-job-utils";
import { useStore } from "@/lib/store";
import type { Business, Strategy } from "@/lib/types";
import { nowIso } from "@/lib/utils";

export function isStrategyGenerating(businessId?: string | null): boolean {
  const s = useStore.getState();
  const id = businessId ?? s.activeBusinessId;
  if (!id) return false;
  const biz = s.businesses.find((b) => b.id === id);
  return biz?.strategyJob?.status === "generating";
}

function applyStrategyResult(businessId: string, strategy: Strategy, businessName: string) {
  const store = useStore.getState();
  const biz = store.businesses.find((b) => b.id === businessId);
  store.setStrategy(businessId, { ...strategy, status: "pending_review" });
  store.setFlow(businessId, { strategy: "pending_review" });
  if (biz) {
    store.upsertBusiness({
      ...biz,
      strategyJob: { status: "completed", updatedAt: nowIso() },
    });
  }
  window.dispatchEvent(
    new CustomEvent("loca:strategy-ready", {
      detail: { businessId, name: businessName },
    })
  );
}

function applyStrategyFailed(businessId: string, error: string) {
  const store = useStore.getState();
  const biz = store.businesses.find((b) => b.id === businessId);
  if (!biz) return;
  store.upsertBusiness({
    ...biz,
    strategyJob: { status: "failed", error, updatedAt: nowIso() },
  });
  window.dispatchEvent(
    new CustomEvent("loca:strategy-failed", {
      detail: { businessId, error },
    })
  );
}

/** Jobs en vuelo para no duplicar fetch si ya hay uno corriendo. */
const inFlight = new Set<string>();

async function waitForStrategyFromServer(businessId: string, businessName: string) {
  const maxMs = 120_000;
  const started = Date.now();

  while (Date.now() - started < maxMs) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const store = useStore.getState();
      const biz = store.businesses.find((b) => b.id === businessId);
      const res = await fetch("/api/snapshot", { headers: locaUserHeaders(biz) });
      if (!res.ok) continue;

      const snap = await res.json();
      store.hydrateFromServer(snap);

      const serverBiz = (snap.businesses as Business[] | undefined)?.find((b) => b.id === businessId);
      const job = serverBiz?.strategyJob;
      const strat = snap.strategies?.[businessId] as Strategy | undefined;

      if (job?.status === "completed" && strat) {
        applyStrategyResult(businessId, strat, businessName);
        return;
      }
      if (job?.status === "failed") {
        applyStrategyFailed(businessId, job.error || "No se pudo generar la estrategia");
        return;
      }
    } catch {
      /* polling best-effort */
    }
  }

  applyStrategyFailed(businessId, "La generación tardó demasiado. Reintentá.");
}

export function restartStrategyGeneration(businessId: string, feedback?: string): void {
  inFlight.delete(businessId);
  const store = useStore.getState();
  const biz = store.businesses.find((b) => b.id === businessId);
  if (biz) {
    store.upsertBusiness({
      ...biz,
      strategyJob: { status: "generating", updatedAt: nowIso() },
    });
  }
  inFlight.add(businessId);
  void runStrategyJob(businessId, feedback);
}

async function runStrategyJob(businessId: string, feedback?: string) {
  const store = useStore.getState();
  const biz = store.businesses.find((b) => b.id === businessId);
  if (!biz) return;

  try {
    await syncRepositoryToServer({ includeBusiness: biz });

    const res = await fetch("/api/strategy/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...locaUserHeaders(biz) },
      body: JSON.stringify({ businessId, feedback }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      status?: string;
      strategy?: Strategy;
      error?: string;
    };

    if (res.status === 202 || body.status === "generating") {
      await waitForStrategyFromServer(businessId, biz.name);
      return;
    }

    if (res.ok && body.strategy) {
      applyStrategyResult(businessId, body.strategy, biz.name);
      return;
    }

    applyStrategyFailed(businessId, body.error || "No se pudo generar la estrategia");
  } catch (e) {
    applyStrategyFailed(
      businessId,
      e instanceof Error ? e.message : "Error de conexión al generar"
    );
  } finally {
    inFlight.delete(businessId);
  }
}

/**
 * Arranca generación sin bloquear la UI.
 * El fetch vive en el browser (~50s) y mantiene viva la conexión al servidor.
 */
export function startStrategyInBackground(businessId: string, feedback?: string): void {
  if (inFlight.has(businessId)) return;

  const store = useStore.getState();
  const biz = store.businesses.find((b) => b.id === businessId);
  if (!biz) return;

  if (biz.strategyJob?.status === "generating" && !isStrategyJobStale(biz.strategyJob)) return;

  inFlight.add(businessId);

  if (biz.strategyJob?.status !== "generating") {
    store.upsertBusiness({
      ...biz,
      strategyJob: { status: "generating", updatedAt: nowIso() },
    });
  }

  void runStrategyJob(businessId, feedback);
}
