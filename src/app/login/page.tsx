"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { enterDemoMode } from "@/lib/auth/session";
import { toLocaUser } from "@/lib/auth/user";
import { hasOnboardingDraft } from "@/lib/onboarding-draft";
import { resumeOnboardingDraftIfAny } from "@/lib/onboarding/complete";
import { getSupabaseBrowser, hasSupabaseClientConfig } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui";
import { Logo } from "@/components/brand";
import { identifyUser, track } from "@/lib/analytics";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useStore((s) => s.login);
  const clearUserData = useStore((s) => s.clearUserData);
  const setUser = useStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const supabaseEnabled = hasSupabaseClientConfig();
  const sessionExpired = searchParams.get("reason") === "session_expired";
  const fromOnboarding = searchParams.get("from") === "onboarding";

  async function afterAuth(supabaseUser: Parameters<typeof toLocaUser>[0]) {
    const newUser = toLocaUser(supabaseUser);
    const prev = useStore.getState().user;
    if (prev?.id !== newUser.id) clearUserData();
    setUser(newUser);
    identifyUser(newUser);
    track("login_completed", { fromOnboarding });
    if (await resumeOnboardingDraftIfAny(router)) return;
    if (fromOnboarding) {
      router.push("/onboarding");
      return;
    }
    router.push("/dashboard");
  }

  useEffect(() => {
    if (!supabaseEnabled) {
      setCheckingSession(false);
      return;
    }
    getSupabaseBrowser()
      .auth.getUser()
      .then(async ({ data }) => {
        if (data.user) {
          if (hasOnboardingDraft()) {
            await afterAuth(data.user);
            return;
          }
          router.replace("/dashboard");
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => setCheckingSession(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (data.user) await afterAuth(data.user);
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
        <p className="text-sm text-faint">Verificando sesión…</p>
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
          <p className="mt-3 text-sm text-muted-foreground">Tu marketing listo en minutos.</p>
        </div>
        <Card className="p-8 shadow-glow">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Hola de nuevo 👋</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {fromOnboarding
              ? "Iniciá sesión para que Eva genere tu estrategia con los datos que completaste."
              : supabaseEnabled
                ? "Ingresá con tu email y contraseña."
                : "Ingresá tu email para continuar."}
          </p>
          {sessionExpired && (
            <p className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              Tu sesión expiró. Volvé a iniciar sesión para continuar.
            </p>
          )}
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
            {error && <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Entrando…" : fromOnboarding ? "Entrar y generar estrategia" : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-faint">o probá sin cuenta</span>
            <div className="h-px flex-1 bg-border" />
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
          <p className="mt-7 text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link href="/signup" className="font-semibold text-accent hover:underline">
              Crear cuenta
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="loca-soft-bg flex min-h-screen items-center justify-center px-5 py-10">
          <p className="text-sm text-faint">Cargando…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
