import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  customerAdmin,
  customerCors,
  requireCustomer,
} from "../server/customer.js";
import { revokeApple } from "../server/apple.js";
import { fail } from "../server/http.js";
import { HttpError } from "../server/auth.js";
const deletion = z
  .object({
    confirm: z.literal(true),
    authorization_code: z.string().max(4096).optional(),
    provider_refresh_token: z.string().max(4096).optional(),
    apple_platform: z.enum(["native", "web"]).optional(),
  })
  .strict();
export default async function account(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    customerCors(request, response);
    if (request.method === "OPTIONS")
      return response.status(200).json({ ok: true });
    if (request.method !== "DELETE") {
      response.setHeader("Allow", "DELETE, OPTIONS");
      return response.status(405).json({ error: "Method not allowed." });
    }
    const user = await requireCustomer(request);
    const input = deletion.parse(request.body);
    const apple = user.identities?.find(
      (identity) => identity.provider === "apple",
    );
    if (apple) {
      if (!input.authorization_code && !input.provider_refresh_token)
        return response
          .status(409)
          .json({ error: "Sign in with Apple again.", code: "apple_reauth" });
      await revokeApple(input, String(apple.identity_data?.sub || apple.id));
    }
    // A hard auth deletion cascades to all customer tables. Catalog content is independent.
    const { error } = await customerAdmin().auth.admin.deleteUser(
      user.id,
      false,
    );
    if (error)
      throw new HttpError(
        502,
        "Could not delete the account. Please try again.",
      );
    return response.status(200).json({ deleted: true });
  } catch (error) {
    return fail(response, error);
  }
}
