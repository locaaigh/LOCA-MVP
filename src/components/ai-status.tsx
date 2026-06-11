"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui";

let cached: { hasOpenAI: boolean } | null = null;

export function useAiStatus() {
  const [status, setStatus] = useState<{ hasOpenAI: boolean } | null>(cached);
  useEffect(() => {
    if (cached) return;
    api
      .status()
      .then((s) => {
        cached = s;
        setStatus(s);
      })
      .catch(() => setStatus({ hasOpenAI: false }));
  }, []);
  return status;
}

export function AiStatusBadge() {
  const status = useAiStatus();
  if (!status) return null;
  return status.hasOpenAI ? (
    <Badge tone="green">IA real activada</Badge>
  ) : (
    <Badge tone="yellow">Modo demo · sin API key</Badge>
  );
}
