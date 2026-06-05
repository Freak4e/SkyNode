import { readApiJson } from "./http.js";

type PasswordResetResponse = {
  message: string;
};

export async function requestPasswordReset(email: string, redirectTo: string): Promise<PasswordResetResponse> {
  const response = await fetch("/api/auth/password-reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, redirectTo }),
  });

  const body = await readApiJson<PasswordResetResponse>(
    response,
    "Password reset request failed before the server returned JSON.",
    { message: "Password reset request failed." },
  );

  if (!response.ok) {
    throw new Error(body.message || "Password reset request failed.");
  }

  return body;
}
