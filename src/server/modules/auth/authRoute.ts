import { createClient } from "@supabase/supabase-js";
import { Router } from "express";
import { requireSupabaseSecretKey, requireSupabaseUrl } from "../../../config.js";
import { query } from "../../infrastructure/database/client.js";

export const authRoute = Router();

class DisabledRealtimeWebSocket {
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readonly readyState = this.CLOSED;
  readonly url = "";
  readonly protocol = "";
  binaryType?: string;
  bufferedAmount = 0;
  extensions = "";
  onopen: ((this: unknown, ev: Event) => unknown) | null = null;
  onmessage: ((this: unknown, ev: MessageEvent) => unknown) | null = null;
  onclose: ((this: unknown, ev: CloseEvent) => unknown) | null = null;
  onerror: ((this: unknown, ev: Event) => unknown) | null = null;

  close(): void {
    // The server auth route does not use realtime channels.
  }

  send(): void {
    throw new Error("Realtime is disabled for the server-side Supabase auth client.");
  }

  addEventListener(): void {
    // The server auth route does not use realtime channels.
  }

  removeEventListener(): void {
    // The server auth route does not use realtime channels.
  }
}

authRoute.post("/password-reset", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const redirectTo = String(req.body?.redirectTo || "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      message: "Enter a valid email address.",
    });
  }

  if (!redirectTo.startsWith("http")) {
    return res.status(400).json({
      message: "Invalid password reset redirect URL.",
    });
  }

  try {
    const exists = await authEmailExists(email);

    if (!exists) {
      return res.status(404).json({
        message: "No account found with this email. Check the spelling or create an account first.",
      });
    }

    const admin = createSupabaseAdmin();
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      throw error;
    }

    return res.json({
      message: `Password reset link sent to ${email}. Check your inbox and spam folder.`,
    });
  } catch (error) {
    console.error("[route:auth] password reset failed", error);

    return res.status(502).json({
      message: error instanceof Error ? error.message : "Failed to send password reset email.",
    });
  }
});

async function authEmailExists(email: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    "select id from auth.users where lower(email) = $1 limit 1",
    [email],
  );

  return (result.rowCount ?? 0) > 0;
}

function createSupabaseAdmin() {
  return createClient(requireSupabaseUrl(), requireSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: DisabledRealtimeWebSocket,
    },
  });
}
