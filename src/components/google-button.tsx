"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { getSupabaseBrowser, hasSupabaseClientConfig } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.11z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

/**
 * "Continuar con Google" (OAuth de Supabase). Redirige a Google y vuelve por
 * /auth/callback, que intercambia el code por sesión. El destino post-login
 * viaja en ?next= (el callback lo respeta).
 */
export function GoogleButton({ next = "/dashboard", label = "Continuar con Google" }: { next?: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!hasSupabaseClientConfig()) return null;

  async function go() {
    setLoading(true);
    setError("");
    try {
      const { error: err } = await getSupabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (err) {
        setError(
          /provider is not enabled/i.test(err.message)
            ? "Google no está habilitado todavía (falta configurarlo en Supabase)."
            : err.message
        );
        setLoading(false);
      }
      // Si no hay error, el navegador ya está yendo a Google.
    } catch {
      setError("No se pudo iniciar con Google. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" size="lg" className="w-full" disabled={loading} onClick={() => void go()}>
        <GoogleIcon /> {loading ? "Redirigiendo…" : label}
      </Button>
      {error && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">{error}</p>}
    </div>
  );
}
