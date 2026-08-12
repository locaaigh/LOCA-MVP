import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Rutas que pertenecen a la PLATAFORMA (app.heyloca.ai).
 * "/" en el subdominio de app se manda a /dashboard.
 */
const APP_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/login",
  "/signup",
  "/content",
  "/calendar",
  "/strategy",
  "/ads",
  "/metrics",
  "/settings",
  "/demo",
  "/auth",
];

/** Rutas que pertenecen solo a la WEB de marketing (heyloca.ai). */
const MARKETING_ONLY_PREFIXES = [
  "/precios",
  "/para",
  "/como-funciona",
  "/funcionalidades",
  "/contacto",
];

/** Compartidas por ambos dominios (nunca se redirigen): legal, api, assets. */
const SHARED_PREFIXES = ["/legal", "/api", "/_next", "/favicon"];

function startsWithAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Compara hosts ignorando el prefijo "www.", así da igual cuál de los dos sea
 * el canónico: con `heyloca.ai` o con `www.heyloca.ai` en
 * NEXT_PUBLIC_MARKETING_ORIGIN, ambas variantes se reconocen como marketing.
 * (Vercel ya redirige una a la otra, pero no dependemos de que eso pase antes
 * que el middleware.)
 */
function sameHost(a: string, b: string): boolean {
  const bare = (h: string) => h.replace(/^www\./, "");
  return bare(a) === bare(b);
}

/** Qué dominio del split está sirviendo la request. */
type HostRole = "app" | "marketing" | "unknown";

type ResolvedHosts = {
  role: HostRole;
  appOrigin: URL;
  marketingOrigin: URL;
};

/**
 * Resuelve los orígenes del split y en cuál de ellos entró la request.
 * Solo se activa si NEXT_PUBLIC_APP_ORIGIN está seteado (ej.
 * "https://app.heyloca.ai"); sin esa env devuelve null y todo convive en un
 * dominio (comportamiento de dev / deploy único).
 */
function resolveHosts(request: NextRequest): ResolvedHosts | null {
  const appOriginRaw = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (!appOriginRaw) return null;

  let appOrigin: URL;
  try {
    appOrigin = new URL(appOriginRaw);
  } catch {
    return null;
  }
  const appHost = appOrigin.host;

  // Origen de marketing: env explícita o derivado quitando el prefijo "app.".
  const marketingOriginRaw = process.env.NEXT_PUBLIC_MARKETING_ORIGIN;
  const marketingHost = marketingOriginRaw
    ? new URL(marketingOriginRaw).host
    : appHost.replace(/^app\./, "");
  const marketingOrigin = marketingOriginRaw
    ? new URL(marketingOriginRaw)
    : new URL(`${appOrigin.protocol}//${marketingHost}`);

  const host = request.headers.get("host") ?? "";
  // Host desconocido (localhost, previews de Vercel): no interferir.
  const role: HostRole =
    host === appHost ? "app" : sameHost(host, marketingHost) ? "marketing" : "unknown";

  return { role, appOrigin, marketingOrigin };
}

/** Ruteo por host: manda cada ruta al dominio al que pertenece. */
function hostRedirect(request: NextRequest, hosts: ResolvedHosts): NextResponse | null {
  if (hosts.role === "unknown") return null;

  const { pathname, search } = request.nextUrl;
  if (startsWithAny(pathname, SHARED_PREFIXES)) return null;

  if (hosts.role === "app") {
    // En el subdominio de la app, la raíz va al dashboard.
    if (pathname === "/") {
      return NextResponse.redirect(new URL(`/dashboard${search}`, hosts.appOrigin));
    }
    // Rutas de marketing pedidas en el subdominio de app → mandarlas a la web.
    if (startsWithAny(pathname, MARKETING_ONLY_PREFIXES)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, hosts.marketingOrigin));
    }
    return null;
  }

  // marketing: rutas de la plataforma pedidas en la web → mandarlas a la app.
  if (startsWithAny(pathname, APP_PREFIXES)) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, hosts.appOrigin));
  }
  return null;
}

/** Refresca la sesión de Supabase en cada request (cookies). */
async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() refresca el token si expiró y actualiza las cookies.
  await supabase.auth.getUser();

  return response;
}

export async function middleware(request: NextRequest) {
  const hosts = resolveHosts(request);
  if (hosts) {
    const redirect = hostRedirect(request, hosts);
    if (redirect) return redirect;
  }

  const response = await refreshSession(request);

  // La plataforma no se indexa nunca. robots.ts se sirve idéntico en los dos
  // hosts, así que sin este header las rutas compartidas (/legal/*, que están
  // en SHARED_PREFIXES y no se redirigen) quedarían duplicadas en Google.
  if (hosts?.role === "app") {
    response.headers.set("X-Robots-Tag", "noindex");
  }

  return response;
}

export const config = {
  matcher: [
    // Todo menos estáticos e imágenes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
