import "dotenv/config";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "../api/vehicles";
import { database } from "../server/database";
const params = new URLSearchParams({
  auth_date: String(Math.floor(Date.now() / 1000)),
  user: JSON.stringify({ id: 5549806778, first_name: "Verification" }),
});
const secret = createHmac("sha256", "WebAppData")
  .update(process.env.TELEGRAM_BOT_TOKEN!)
  .digest();
const check = [...params.entries()]
  .sort(([a], [b]) => (a < b ? -1 : 1))
  .map(([k, v]) => `${k}=${v}`)
  .join("\n");
params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
async function call(
  method: string,
  body?: unknown,
  query: Record<string, string> = {},
  authorization = `tma ${params}`,
) {
  if (process.argv.includes("--remote")) {
    const res = await fetch(
      `${process.env.APP_URL}/api/vehicles?${new URLSearchParams(query)}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000),
      },
    );
    return { status: res.status, data: await res.json() };
  }
  let status = 200;
  let data: any;
  const res = {
    setHeader() {},
    status(code: number) {
      status = code;
      return res;
    },
    json(value: unknown) {
      data = value;
      return res;
    },
  } as unknown as VercelResponse;
  await handler(
    { method, body, query, headers: { authorization } } as VercelRequest,
    res,
  );
  return { status, data };
}
const db = database();
const model = randomUUID();
let section: string | undefined;
try {
  assert.equal((await call("GET", undefined, {}, "")).status, 401);
  section = (
    await db.query(
      "insert into public.catalog_sections(root_key,name) values('parts','__vehicle_api_qa__')returning id",
    )
  ).rows[0].id;
  const input = {
    kind: "model",
    id: model,
    make: `__api_qa_${model}`,
    model: "Verification",
    active: true,
  };
  const created = await call("POST", input);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const duplicates = await Promise.all(
    Array.from({ length: 6 }, () => call("POST", input)),
  );
  assert.ok(duplicates.every((r) => r.status === 201));
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.vehicle_models where id=$1",
        [model],
      )
    ).rows[0].n,
    1,
  );
  const rules = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      call("POST", {
        kind: "rule",
        id: randomUUID(),
        section_id: section,
        model_id: model,
        year_from: 2020 + i,
        year_to: 2020 + i,
        engine: "",
        trim: "",
      }),
    ),
  );
  assert.ok(
    rules.every((r) => r.status === 201),
    JSON.stringify(rules),
  );
  const rule = rules[0].data.item;
  const edits = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      call("PATCH", {
        kind: "rule",
        id: rule.id,
        version: rule.version,
        section_id: section,
        model_id: model,
        year_from: 2020,
        year_to: 2020,
        engine: `engine-${i}`,
        trim: "",
      }),
    ),
  );
  assert.equal(edits.filter((r) => r.status === 200).length, 1);
  assert.equal(edits.filter((r) => r.status === 409).length, 5);
  const current = edits.find((r) => r.status === 200)!.data.item;
  assert.equal(
    (await call("DELETE", { kind: "rule", id: rule.id, version: rule.version }))
      .status,
    409,
  );
  assert.equal(
    (
      await call("DELETE", {
        kind: "rule",
        id: rule.id,
        version: current.version,
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("GET", undefined, { section: section! })).data.items.length,
    5,
  );
  const deactivated = await call("PATCH", {
    ...input,
    active: false,
    version: 1,
  });
  assert.equal(deactivated.status, 200);
  assert.equal(
    (
      await call("POST", {
        kind: "rule",
        id: randomUUID(),
        section_id: section,
        model_id: model,
        year_from: 2020,
        year_to: 2020,
      })
    ).status,
    409,
  );
  console.log(
    "Vehicle API passed: authenticated access, six concurrent creates, idempotent retries, one-winner edits, stale-delete protection, rule paging and inactive model protection.",
  );
} finally {
  if (section)
    await db.query("delete from public.catalog_sections where id=$1", [
      section,
    ]);
  await db.query("delete from public.vehicle_models where id=$1", [model]);
  await db.end();
}
