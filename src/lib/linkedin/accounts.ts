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

type AclResponse = {
  elements?: { organizationalTarget?: string; role?: string; state?: string }[];
};

/**
 * Páginas de empresa donde el usuario es ADMINISTRATOR.
 * GET /rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR (scope rw_organization_admin).
 * Luego resuelve el nombre de cada organización.
 */
export async function fetchAdminOrganizations(token: string): Promise<LinkedInOrg[]> {
  const acls = await liGet<AclResponse>(
    "/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED",
    token
  );
  const urns = (acls.elements ?? [])
    .map((e) => e.organizationalTarget)
    .filter((u): u is string => !!u);

  const orgs: LinkedInOrg[] = [];
  for (const urn of urns) {
    const id = urn.split(":").pop() || "";
    if (!id) continue;
    let name = `Organización ${id}`;
    try {
      const org = await liGet<{ localizedName?: string; name?: { localized?: Record<string, string> } }>(
        `/rest/organizations/${id}`,
        token
      );
      name = org.localizedName || Object.values(org.name?.localized || {})[0] || name;
    } catch {
      // Si no se pudo resolver el nombre, dejamos el fallback con el id.
    }
    orgs.push({ id, urn, name });
  }
  return orgs;
}

/**
 * Elige la organización a conectar: la primera que administra el usuario.
 * (La selección entre varias páginas queda como mejora de UI posterior.)
 */
export function pickOrganization(orgs: LinkedInOrg[]): LinkedInOrg | null {
  return orgs[0] ?? null;
}
