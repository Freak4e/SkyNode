import { supabase } from "../lib/supabaseClient.js";

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    return null;
  }

  const expiresAtMs = (session.expires_at || 0) * 1000;
  const refreshSoon = expiresAtMs > 0 && expiresAtMs - Date.now() < 60_000;

  if (!refreshSoon) {
    return session.access_token;
  }

  const { data: refreshed } = await supabase.auth.refreshSession();

  return refreshed.session?.access_token || session.access_token;
}
