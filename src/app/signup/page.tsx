"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Button, Card, Field, Input } from "@/components/ui";
import { Logo } from "@/components/brand";

export default function SignupPage() {
  const router = useRouter();
  const signup = useStore((s) => s.signup);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    signup(email.trim(), name.trim() || email.split("@")[0]);
    router.push("/onboarding");
  };

  return (
    <main className="loca-soft-bg flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link href="/" className="inline-block transition hover:opacity-80">
            <Logo className="text-3xl" />
          </Link>
          <p className="mt-3 text-sm text-zinc-500">Tu marketing listo en minutos.</p>
        </div>
        <Card className="p-8 shadow-glow">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Creá tu cuenta</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Empezá gratis, sin tarjeta. Toma 2 minutos.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Nombre">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
            </Field>
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
              Crear cuenta y empezar
            </Button>
          </form>
          <p className="mt-7 text-center text-sm text-zinc-500">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold text-loca-600 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
