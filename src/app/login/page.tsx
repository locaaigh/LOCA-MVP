"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Button, Card, Field, Input } from "@/components/ui";
import { Logo } from "@/components/brand";

export default function LoginPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const loginDemo = useStore((s) => s.loginDemo);
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    login(email.trim());
    router.push("/dashboard");
  };

  return (
    <main className="loca-soft-bg flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/">
            <Logo className="text-3xl" />
          </Link>
          <p className="mt-2 text-sm text-zinc-500">Tu marketing listo en minutos.</p>
        </div>
        <Card className="p-7">
          <h1 className="text-xl font-bold">Hola de nuevo 👋</h1>
          <p className="mt-1 text-sm text-zinc-500">Ingresá tu email para continuar.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@negocio.com"
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              Entrar
            </Button>
          </form>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">o probá sin cuenta</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <Button
            variant="lima"
            size="lg"
            className="mt-4 w-full"
            onClick={() => {
              loginDemo();
              router.push("/dashboard");
            }}
          >
            Probar en modo demo
          </Button>
          <p className="mt-6 text-center text-sm text-zinc-500">
            ¿No tenés cuenta?{" "}
            <Link href="/signup" className="font-semibold text-loca-600 hover:underline">
              Crear cuenta
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
