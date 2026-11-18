// ─────────────────────────────────────────────────────────────
// Identidad del usuario que conecta y las páginas de empresa que
// administra (para elegir dónde publica LOCA).
// ─────────────────────────────────────────────────────────────
import { liGet } from "./client";

export type LinkedInMember = { id: string; name: string };
export type LinkedInOrg = { id: string; urn: string; name: string };

/** GET /v2/me — id y nombre del usuario (scope r_basicprofile). */
export async function fetchMember(token: string): Promise<LinkedInMember> {
  const me = await liGet<{
    id: string;
    localizedFirstName?: string;
    localizedLastName?: string;
  }>("/v2/me", token);
  const name = [me.localizedFirstName, me.localizedLastName].filter(Boolean).join(" ").trim();
  return { id: me.id, name: name || "Usuario de LinkedIn" };
}

/**
 * Un elemento de /rest/organizationAcls. La doc muestra la organización bajo
 * `organization` (finder roleAssignee) y bajo `organizationTarget` (finder
 * organization / respuestas paginadas); la API vieja usaba
 * `organizationalTarget`. Aceptamos las tres para no volver a quedar con
 * "no encontramos una página" por un nombre de campo.
 */
type AclElement = {
  organization?: string;
  organizationTarget?: string;
  organizationalTarget?: string;
  roleAssignee?: string;
  role?: string;
  state?: string;
};

type AclResponse = { elements?: AclElement[] };

export type AdminOrganizations = {
  orgs: LinkedInOrg[];
  /** urn:li:person:{id} del usuario, según el ACL (fallback si /v2/me falla). */
  memberUrn: string | null;
};

function orgUrnOf(e: AclElement): string | null {
  return e.organization || e.organizationTarget || e.organizationalTarget || null;
}

/**
 * Páginas de empresa donde el usuario es ADMINISTRATOR.
 * GET /rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED
 * (scope rw_organization_admin). Luego resuelve el nombre de cada organización
 * una por una: el BATCH_GET no está permitido en el tier Development de la app.
 */
export async function fetchAdminOrganizations(token: string): Promise<AdminOrganizations> {
  const acls = await liGet<AclResponse>(
    "/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50",
    token
  );
  const elements = acls.elements ?? [];
  const memberUrn = elements.find((e) => e.roleAssignee)?.roleAssignee ?? null;

  const seen = new Set<string>();
  const orgs: LinkedInOrg[] = [];
  for (const e of elements) {
    const urn = orgUrnOf(e);
    if (!urn) continue;
    const id = urn.split(":").pop() || "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    orgs.push({ id, urn, name: await fetchOrganizationName(id, token) });
  }
  return { orgs, memberUrn };
}

/** Nombre de una organización; si no se puede resolver, cae a "Página {id}". */
export async function fetchOrganizationName(id: string, token: string): Promise<string> {
  try {
    const org = await liGet<{
      localizedName?: string;
      name?: { localized?: Record<string, string> };
    }>(`/rest/organizations/${id}`, token);
    return org.localizedName || Object.values(org.name?.localized || {})[0] || `Página ${id}`;
  } catch {
    return `Página ${id}`;
  }
}

/**
 * Elige la organización a conectar por defecto: la primera que administra el
 * usuario. Si administra varias, la UI de Settings le deja cambiarla.
 */
export function pickOrganization(orgs: LinkedInOrg[]): LinkedInOrg | null {
  return orgs[0] ?? null;
}
