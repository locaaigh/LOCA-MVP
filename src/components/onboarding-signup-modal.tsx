"use client";

import { useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { establishAuthenticatedUser } from "@/lib/auth/session";
import { completeOnboardingAndGoToStrategy } from "@/lib/onboarding/complete";
import { saveOnboardingDraft } from "@/lib/onboarding-draft";
import type { Business } from "@/lib/types";
import { Button, Field, Input, Modal } from "@/components/ui";

type Props = {
  open: boolean;
  business: Business;
  onClose: () => void;
  router: AppRouterInstance;
};

export function OnboardingSignupModal({ open, business, onClose, router }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError("");
    setLoading(true);
    try {
      saveOnboardingDraft(business);
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
            ? "Ese email ya tiene cuenta. Iniciá sesión abajo."
            : err.message
        );
        return;
      }
      if (!data.session?.user) {
        setError("No se pudo crear la sesión. Probá iniciar sesión.");
        return;
      }
      await establishAuthenticatedUser(data.session.user);
      await completeOnboardingAndGoToStrategy(business, router);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function goLogin() {
    saveOnboardingDraft(business);
    onClose();
    router.push("/login?from=onboarding");
  }

  return (
    <Modal open={open} onClose={onClose} title="Creá tu cuenta para continuar">
      <p className="mb-5 text-sm text-zinc-600">
        Tu negocio está listo. Creá una cuenta para que Eva genere tu estrategia y guarde todo en la
        nube.
      </p>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
          />
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
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creando cuenta…" : "Crear cuenta y continuar"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-zinc-500">
        ¿Ya tenés cuenta?{" "}
        <button
          type="button"
          onClick={goLogin}
          className="font-semibold text-loca-600 hover:underline"
        >
          Iniciar sesión
        </button>
      </p>
    </Modal>
  );
}
