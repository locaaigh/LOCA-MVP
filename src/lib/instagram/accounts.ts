// ─────────────────────────────────────────────────────────────
// Identidad de la cuenta de Instagram autenticada.
// ─────────────────────────────────────────────────────────────
import { igGet } from "./graph";

export type IgAccount = {
  /** ID app-scoped de la cuenta: es el {ig-user-id} de media/insights. */
  user_id: string;
  username?: string;
  account_type?: string;
};

/**
 * GET /me — datos de la cuenta de Instagram del token. Devuelve el
 * user_id (destino de publicación) y el username para mostrar en la UI.
 */
export async function fetchIgUser(accessToken: string): Promise<IgAccount> {
  const json = await igGet<{ user_id?: string; id?: string; username?: string; account_type?: string }>(
    "/me",
    accessToken,
    { fields: "user_id,username,account_type" }
  );
  return {
    user_id: String(json.user_id ?? json.id ?? ""),
    username: json.username,
    account_type: json.account_type,
  };
}
