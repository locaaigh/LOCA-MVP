"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { EvaLoading } from "@/components/ui";

export default function DemoPage() {
  const router = useRouter();
  const loginDemo = useStore((s) => s.loginDemo);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    loginDemo();
    const t = setTimeout(() => router.push("/dashboard"), 600);
    return () => clearTimeout(t);
  }, [hydrated, loginDemo, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50">
      <EvaLoading text="Preparando el modo demo con Café Bruma y Casa Nativa…" />
    </main>
  );
}
