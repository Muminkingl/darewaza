import { createPrivateKey, sign } from "node:crypto";
import { HttpError } from "./auth.js";
function clientSecret(clientId: string) {
  const team = process.env.APPLE_TEAM_ID,
    keyId = process.env.APPLE_KEY_ID,
    key = process.env.APPLE_PRIVATE_KEY;
  if (!team || !keyId || !key)
    throw new HttpError(503, "Apple account deletion is not configured.");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: keyId }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: team,
      iat: now,
      exp: now + 300,
      aud: "https://appleid.apple.com",
      sub: clientId,
    }),
  ).toString("base64url");
  const input = `${header}.${payload}`;
  return `${input}.${sign("sha256", Buffer.from(input), { key: createPrivateKey(key.replace(/\\n/g, "\n")), dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
}
export async function revokeApple(
  input: {
    authorization_code?: string;
    provider_refresh_token?: string;
    apple_platform?: "native" | "web";
  },
  appleSubject: string,
) {
  const clientId =
    input.apple_platform === "native"
      ? process.env.APPLE_NATIVE_CLIENT_ID || "com.darewaza.app"
      : process.env.APPLE_WEB_CLIENT_ID;
  if (!clientId)
    throw new HttpError(503, "Apple account deletion is not configured.");
  const secret = clientSecret(clientId);
  let token = input.provider_refresh_token;
  if (input.authorization_code) {
    const res = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: secret,
        code: input.authorization_code,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!res.ok || !data.refresh_token || !data.id_token)
      throw new HttpError(409, "Sign in with Apple again.");
    // Apple issued this token through the authenticated code exchange; match its subject to the caller.
    const claims = JSON.parse(
      Buffer.from(data.id_token.split(".")[1], "base64url").toString(),
    );
    if (claims.sub !== appleSubject)
      throw new HttpError(403, "The Apple account does not match.");
    token = data.refresh_token;
  }
  if (!token) throw new HttpError(409, "Sign in with Apple again.");
  const res = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      token,
      token_type_hint: "refresh_token",
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok)
    throw new HttpError(
      502,
      "Apple authorization could not be revoked. Try again.",
    );
}
