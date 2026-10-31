import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { HttpError } from "./auth.js";
let client: ReturnType<typeof createClient> | undefined;
export function customerAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, "Account service is unavailable.");
  return (client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  }));
}
export function customerCors(request: VercelRequest, response: VercelResponse) {
  const origin = request.headers.origin;
  const allowed = new Set([
    process.env.APP_URL,
    "https://darewaza.vercel.app",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
  ]);
  if (origin && !allowed.has(origin))
    throw new HttpError(403, "Origin is not allowed.");
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  response.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  response.setHeader("Cache-Control", "no-store");
}
export async function requireCustomer(request: VercelRequest) {
  const header = request.headers.authorization;
  if (
    typeof header !== "string" ||
    !/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(header)
  )
    throw new HttpError(401, "Sign in to continue.");
  const { data, error } = await customerAdmin().auth.getUser(header.slice(7));
  if (error || !data.user) throw new HttpError(401, "Sign in to continue.");
  return data.user;
}
