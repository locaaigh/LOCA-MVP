"use client";

import { useEffect, useRef } from "react";
import { locaUserHeaders } from "@/lib/repository/client-sync";
import { isStrategyJobStale } from "@/lib/strategy-job-utils";
import { startStrategyInBackground } from "@/lib/strategy-job";
import { useStore } from "@/lib/store";
import type { Business } from "@/lib/types";
import { useToast } from "@/components/ui";

/** Poll del snapshot mientras hay jobs en curso; toast al terminar. */
export function StrategyJobTracker() {
  const businesses = useStore((s) => s.businesses);
  const hydrateFromServer = useStore((s) => s.hydrateFromServer);
  const setStrategy = useStore((s) => s.setStrategy);
  const setFlow = useStore((s) => s.setFlow);
  const { show, node } = useToast();
  const notifiedRef = useRef(new Set<string>());

  const generatingIds = businesses
    .filter((b) => b.strategyJob?.status === "generating")
    .map((b) => b.id);

  // Toast cuando el fetch en background termina en esta pestaña.
  useEffect(() => {
    const onReady = (e: Event) => {
      const { businessId, name } = (e as CustomEvent).detail as {
        businessId: string;
        name?: string;
      };
      const key = `${businessId}-completed`;
      if (notifiedRef.current.has(key)) return;
      notifiedRef.current.add(key);
      show(`Estrategia de ${name || "tu negocio"} lista ✨`);
    };
    const onFailed = (e: Event) => {
      const { businessId, error } = (e as CustomEvent).detail as {
        businessId: string;
        error?: string;
      };
      const key = `${businessId}-failed`;
      if (notifiedRef.current.has(key)) return;
      notifiedRef.current.add(key);
      show(error || "Error generando la estrategia");
    };
    window.addEventListener("loca:strategy-ready", onReady);
    window.addEventListener("loca:strategy-failed", onFailed);
    return () => {
      window.removeEventListener("loca:strategy-ready", onReady);
      window.removeEventListener("loca:strategy-failed", onFailed);
    };
  }, [show]);

  // Fallback: poll por si se refrescó la pestaña a mitad de generación.
  useEffect(() => {
    if (generatingIds.length === 0) return;

    let active = true;

    const poll = async () => {
      try {
        const res = await fetch("/api/snapshot", { headers: locaUserHeaders() });
        if (!res.ok || !active) return;
        const snap = await res.json();
        hydrateFromServer(snap);

        for (const bid of generatingIds) {
          const localBiz = businesses.find((b) => b.id === bid);
          if (localBiz && isStrategyJobStale(localBiz.strategyJob)) {
            startStrategyInBackground(bid);
            continue;
          }

          const biz = (snap.businesses as Business[]).find((b) => b.id === bid);
          const job = biz?.strategyJob;
          if (!job || job.status === "generating") continue;

          if (job.status === "completed") {
            const strat = snap.strategies?.[bid];
            if (strat) {
              setStrategy(bid, { ...strat, status: "pending_review" });
              setFlow(bid, { strategy: "pending_review" });
            }
            const key = `${bid}-completed`;
            if (!notifiedRef.current.has(key)) {
              notifiedRef.current.add(key);
              show(`Estrategia de ${biz?.name || "tu negocio"} lista ✨`);
            }
          } else if (job.status === "failed") {
            const key = `${bid}-failed`;
            if (!notifiedRef.current.has(key)) {
              notifiedRef.current.add(key);
              show(job.error || "Error generando la estrategia");
            }
          }
        }
      } catch {
        /* polling best-effort */
      }
    };

    void poll();
    const id = setInterval(() => void poll(), 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [generatingIds.join(","), businesses, hydrateFromServer, setFlow, setStrategy, show]);

  return node;
}
