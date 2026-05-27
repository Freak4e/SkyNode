import { getAccessToken } from "../auth/session.js";

export async function authHeaders(extraHeaders: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("Sign in to continue.");
  }

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}
