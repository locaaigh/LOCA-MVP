"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { enterDemoMode } from "@/lib/auth/session";
import { toLocaUser } from "@/lib/auth/user";
import { getSupabaseBrowser, hasSupabaseClientConfig } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui";
import { Logo } from "@/components/brand";

export default function LoginPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const clearUserData = useStore((s) => s.clearUserData);
  const setUser = useStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const supabaseEnabled = hasSupabaseClientConfig();

  // Si ya hay sesión activa, ir directo al dashboard.
  useEffect(() => {
    if (!supabaseEnabled) {
      setCheckingSession(false);
      return;
    }
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace("/dashboard");
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [router, supabaseEnabled]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");

    if (!supabaseEnabled) {
      login(email.trim());
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(
          /invalid login credentials/i.test(err.message)
            ? "Email o contraseña incorrectos"
            : /email not confirmed/i.test(err.message)
              ? "Confirmá tu email antes de entrar (revisá tu casilla)"
              : err.message
        );
        return;
      }
      // Actualizar el store antes de navegar evita el rebote login ↔ dashboard.
      // La hidratación desde el servidor la hace AuthProvider en SIGNED_IN.
      if (data.user) {
        const newUser = toLocaUser(data.user);
        const prev = useStore.getState().user;
        if (prev?.id !== newUser.id) clearUserData();
        setUser(newUser);
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  async function startDemo() {
    setLoading(true);
    try {
      await enterDemoMode();
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="loca-soft-bg flex min-h-screen items-center justify-center px-5 py-10">
        <p className="text-sm text-zinc-400">Verificando sesión…</p>
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Hola de nuevo 👋</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {supabaseEnabled ? "Ingresá con tu email y contraseña." : "Ingresá tu email para continuar."}
          </p>
          <form onSubmit={submit} className="mt-7 space-y-4">
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
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </Field>
            )}
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-medium text-zinc-400">o probá sin cuenta</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <Button
            variant="lima"
            size="lg"
            className="mt-5 w-full"
            disabled={loading}
            onClick={() => void startDemo()}
          >
            Probar demo
          </Button>
          <p className="mt-7 text-center text-sm text-zinc-500">
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
