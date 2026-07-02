import type { Business } from "@/lib/types";

const KEY = "loca-onboarding-pending";

type PendingDraft = {
  business: Business;
  savedAt: string;
};

/** Guarda el negocio listo para persistir tras crear cuenta. */
export function saveOnboardingDraft(business: Business): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: PendingDraft = { business, savedAt: new Date().toISOString() };
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadOnboardingDraft(): Business | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDraft;
    return parsed.business ?? null;
  } catch {
    return null;
  }
}

export function clearOnboardingDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function hasOnboardingDraft(): boolean {
  return loadOnboardingDraft() !== null;
}
