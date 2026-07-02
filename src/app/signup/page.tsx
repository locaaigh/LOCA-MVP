"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { getSupabaseBrowser, hasSupabaseClientConfig } from "@/lib/supabase/client";
import { toLocaUser } from "@/lib/auth/user";
import { Button, Card, Field, Input } from "@/components/ui";
import { Logo } from "@/components/brand";

export default function SignupPage() {
  const router = useRouter();
  const signup = useStore((s) => s.signup);
  const clearUserData = useStore((s) => s.clearUserData);
  const setUser = useStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const supabaseEnabled = hasSupabaseClientConfig();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");

    if (!supabaseEnabled) {
      // Fallback sin Supabase: cuenta local (modo demo)
      signup(email.trim(), name.trim() || email.split("@")[0]);
      router.push("/onboarding");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() || email.split("@")[0] },
        },
      });
      if (err) {
        setError(
          /already registered/i.test(err.message)
            ? "Ese email ya tiene cuenta. Probá iniciar sesión."
            : err.message
        );
        return;
      }
      if (data.session?.user) {
        // Sesión inmediata (confirmación de email desactivada)
        const newUser = toLocaUser(data.session.user);
        const prev = useStore.getState().user;
        if (prev?.id !== newUser.id) clearUserData();
        setUser(newUser);
        router.push("/onboarding");
      } else {
        // Supabase requiere confirmar el email
        setCheckEmail(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <main className="loca-soft-bg flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Card className="p-8 text-center shadow-glow">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Revisá tu email 📬</h1>
            <p className="mt-3 text-sm text-zinc-500">
              Te mandamos un link a <strong>{email}</strong> para confirmar tu cuenta. Después de
              confirmar, iniciá sesión.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block font-semibold text-loca-600 hover:underline"
            >
              Ir a iniciar sesión
            </Link>
          </Card>
        </div>
      </main>
    );
  }

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
            {supabaseEnabled && (
              <Field label="Contraseña">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </Field>
            )}
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Creando cuenta…" : "Crear cuenta y empezar"}
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
