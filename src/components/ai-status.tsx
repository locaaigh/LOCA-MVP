"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui";

interface AiStatus {
  hasTextAI: boolean;
  hasImageAI: boolean;
  textProvider: string;
  textModel: string;
}

let cached: AiStatus | null = null;

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(cached);
  useEffect(() => {
    if (cached) return;
    api
      .status()
      .then((s) => {
        cached = {
          hasTextAI: s.hasTextAI,
          hasImageAI: s.hasImageAI,
          textProvider: s.textProvider,
          textModel: s.textModel,
        };
        setStatus(cached);
      })
      .catch(() => setStatus({ hasTextAI: false, hasImageAI: false, textProvider: "none", textModel: "" }));
  }, []);
  return status;
}

export function AiStatusBadge() {
  const status = useAiStatus();
  if (!status) return null;
  if (!status.hasTextAI && !status.hasImageAI) {
    return <Badge tone="yellow">Modo demo · sin API key</Badge>;
  }
  const label =
    status.textProvider === "anthropic"
      ? "Claude activado"
      : status.textProvider === "openai"
        ? "IA real activada"
        : "IA parcial";
  return <Badge tone="green">{label}</Badge>;
}
