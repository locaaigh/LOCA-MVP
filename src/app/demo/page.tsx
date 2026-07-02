"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { enterDemoMode } from "@/lib/auth/session";
import { EvaLoading } from "@/components/ui";

export default function DemoPage() {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      await enterDemoMode();
      router.push("/dashboard");
    })();
  }, [hydrated, router]);

  return (
    <main className="loca-soft-bg flex min-h-screen items-center justify-center px-5">
      <EvaLoading text="Preparando el modo demo con Café Bruma y Casa Nativa…" />
    </main>
  );
}
