"use client";

// Store de solo-sesión (no persiste) para el overlay de debug de uso de IA.
// Separado de useStore (store.ts) a propósito: es puro dato de debug, no
// pertenece al modelo de negocio ni a su lógica de hidratación/merge.
import { create } from "zustand";
import { uid, nowIso } from "./utils";

export interface AiUsageEntry {
  id: string;
  agent: string;
  provider: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  at: string;
}

interface AiUsageState {
  entries: AiUsageEntry[];
  push: (e: Omit<AiUsageEntry, "id" | "at">) => void;
}

export const useAiUsageStore = create<AiUsageState>((set) => ({
  entries: [],
  push: (e) =>
    set((s) => ({ entries: [...s.entries, { ...e, id: uid("usage"), at: nowIso() }].slice(-200) })),
}));
