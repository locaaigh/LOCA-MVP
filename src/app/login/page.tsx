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
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/">
            <Logo className="text-3xl" />
          </Link>
          <p className="mt-2 text-sm text-zinc-500">Humanless marketing.</p>
        </div>
        <Card className="p-7">
          <h1 className="text-xl font-bold">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Auth mock para el MVP: ingresá cualquier email.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@negocio.com"
                required
              />
            </Field>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">o</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <Button
            variant="lima"
            className="mt-4 w-full"
            onClick={() => {
              loginDemo();
              router.push("/dashboard");
            }}
          >
            Probar en modo demo
          </Button>
          <p className="mt-5 text-center text-sm text-zinc-500">
            ¿No tenés cuenta?{" "}
            <Link href="/signup" className="font-medium text-loca-600 hover:underline">
              Crear cuenta
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
