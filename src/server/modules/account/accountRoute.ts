import axios from "axios";
import { Router } from "express";
import { requireSupabaseSecretKey, requireSupabaseUrl } from "../../../config.js";
import { getAuthenticatedUserId, requireAuth } from "../../middleware/authMiddleware.js";
import { query } from "../../infrastructure/database/client.js";
import { ensureSchema } from "../../infrastructure/database/schema.js";

export const accountRoute = Router();

accountRoute.use(requireAuth);

accountRoute.delete("/", async (_req, res) => {
  try {
    const userId = getAuthenticatedUserId(res);

    await ensureSchema();
    await query("delete from trips where user_id = $1", [userId]);
    await deleteSupabaseAuthUser(userId);

    return res.status(204).send();
  } catch (error) {
    console.error("[route:account] delete failed", error);

    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to delete account."],
    });
  }
});

async function deleteSupabaseAuthUser(userId: string): Promise<void> {
  const supabaseUrl = requireSupabaseUrl().replace(/\/$/, "");
  const secretKey = requireSupabaseSecretKey();

  await axios.delete(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: {
      apikey: secretKey,
      authorization: `Bearer ${secretKey}`,
    },
    timeout: 15000,
  });
}
