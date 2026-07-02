"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { Business } from "@/lib/types";
import { syncRepositoryToServer } from "@/lib/repository/client-sync";
import { clearOnboardingDraft, loadOnboardingDraft } from "@/lib/onboarding-draft";
import { startStrategyInBackground } from "@/lib/strategy-job";
import { useStore } from "@/lib/store";
import { nowIso } from "@/lib/utils";

export function prepareFinalBusiness(b: Business, userId: string): Business {
  const bkColors = b.brandKit?.colors;
  const brandColors = bkColors?.primary
    ? [
        bkColors.primary,
        bkColors.accent || bkColors.secondary || "#84cc16",
        bkColors.background || "#ffffff",
      ]
    : b.brandColors;

  return {
    ...b,
    brandColors,
    productsServices: b.productsServices.map((p) => ({ ...p, saved: true })),
    userId,
    onboardingComplete: true,
    updatedAt: nowIso(),
  };
}

/** Persiste el negocio, sincroniza al servidor, arranca estrategia en background y va al dashboard. */
export async function completeOnboardingAndGoToStrategy(
  business: Business,
  router: AppRouterInstance
): Promise<void> {
  const userId = useStore.getState().user?.id;
  if (!userId) throw new Error("Necesitás iniciar sesión para continuar");

  const finalBiz = prepareFinalBusiness(business, userId);
  useStore.getState().upsertBusiness(finalBiz);
  await syncRepositoryToServer({ includeBusiness: finalBiz });
  clearOnboardingDraft();
  startStrategyInBackground(finalBiz.id);
  router.push("/dashboard");
}

/** Retoma un borrador guardado antes del signup/login. */
export async function resumeOnboardingDraftIfAny(
  router: AppRouterInstance
): Promise<boolean> {
  const draft = loadOnboardingDraft();
  if (!draft) return false;
  await completeOnboardingAndGoToStrategy(draft, router);
  return true;
}
