import type { NextFunction, Request, Response } from "express";
import axios from "axios";
import { requireSupabaseAnonKey, requireSupabaseUrl } from "../../config.js";

type SupabaseUserResponse = {
  id?: string;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  const token = bearerToken(authHeader);

  if (!token) {
    return res.status(401).json({ warnings: ["Sign in to continue."] });
  }

  void verifySupabaseToken(token)
    .then((userId) => {
      res.locals.userId = userId;
      next();
    })
    .catch((error) => {
      console.error("[auth] token verification failed", error);
      res.status(401).json({ warnings: ["Your session expired. Sign in again."] });
    });
}

export function getAuthenticatedUserId(res: Response): string {
  const userId = res.locals.userId;

  if (typeof userId !== "string" || !userId) {
    throw new Error("Missing authenticated user.");
  }

  return userId;
}

export function getOptionalUserId(res: Response): string | undefined {
  const userId = res.locals.userId;
  return typeof userId === "string" && userId ? userId : undefined;
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  const token = bearerToken(authHeader);

  if (!token) {
    next();
    return;
  }

  void verifySupabaseToken(token)
    .then((userId) => {
      res.locals.userId = userId;
      next();
    })
    .catch(() => {
      next();
    });
}

function bearerToken(authHeader: string | undefined): string | undefined {
  if (!authHeader) return undefined;

  const separatorIndex = authHeader.indexOf(" ");
  if (separatorIndex < 0) return undefined;

  const scheme = authHeader.slice(0, separatorIndex).toLowerCase();
  const token = authHeader.slice(separatorIndex + 1).trim();

  return scheme === "bearer" && token ? token : undefined;
}

async function verifySupabaseToken(token: string): Promise<string> {
  const supabaseUrl = requireSupabaseUrl().replace(/\/$/, "");
  const anonKey = requireSupabaseAnonKey();
  const response = await axios.get<SupabaseUserResponse>(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
    },
    timeout: 10000,
  });

  if (!response.data.id) {
    throw new Error("Supabase did not return a user id.");
  }

  return response.data.id;
}
