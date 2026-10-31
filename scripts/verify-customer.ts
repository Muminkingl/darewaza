import "dotenv/config";
import assert from "node:assert/strict";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { rootCertificates } from "node:tls";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL!,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY!,
  anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users: string[] = [];
const clients: SupabaseClient[] = [];
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: [
      ...rootCertificates,
      await readFile(
        new URL("../supabase/prod-ca-2021.crt", import.meta.url),
        "utf8",
      ),
    ],
  },
});
const api = process.argv.includes("--remote")
  ? "https://darewaza.vercel.app"
  : "http://127.0.0.1:3000";
try {
  for (let i = 0; i < 2; i++) {
    const email = `qa-${randomUUID()}@example.com`,
      password = `Qa!${randomUUID()}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.ifError(error);
    users.push(data.user!.id);
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await client.auth.signInWithPassword({ email, password });
    assert.ifError(login.error);
    clients.push(client);
  }
  console.log("Two independent customer accounts can sign in.");
  await db.connect();
  await db.query("begin");
  const {
    rows: [parent],
  } = await db.query(
    "insert into public.catalog_sections(root_key,name) values('accessories','__customer_verification__') returning id",
  );
  const { rows: sections } = await db.query(
    "insert into public.catalog_sections(root_key,parent_id,name) select 'accessories',$1,'__customer_check_'||n from generate_series(1,110)n returning id",
    [parent.id],
  );
  async function role(id: string) {
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: id, role: "authenticated" }),
    ]);
    await db.query("set local role authenticated");
  }
  async function denied(sql: string, params: unknown[], code = "42501") {
    await db.query("savepoint denied");
    let actual;
    try {
      await db.query(sql, params);
    } catch (e) {
      actual = (e as { code: string }).code;
    }
    await db.query("rollback to savepoint denied");
    assert.equal(actual, code);
  }
  await role(users[0]);
  await db.query(
    "insert into public.customer_profiles(user_id,display_name,locale) values($1,$2,$3)",
    [users[0], "QA", "en"],
  );
  await db.query(
    "insert into public.saved_sections(user_id,section_id) values($1,$2)",
    [users[0], parent.id],
  );
  await denied(
    "insert into public.saved_sections(user_id,section_id) values($1,$2)",
    [users[1], parent.id],
  );
  await denied("insert into public.customer_profiles(user_id) values($1)", [
    users[1],
  ]);
  await denied(
    "insert into public.recent_sections(user_id,section_id) values($1,$2)",
    [users[0], parent.id],
  );
  for (const s of sections)
    await db.query("select public.record_recent($1)", [s.id]);
  assert.equal(
    (await db.query("select count(*)::int n from public.recent_sections"))
      .rows[0].n,
    100,
  );
  await db.query("select public.record_recent($1)", [sections.at(-1).id]);
  assert.equal(
    (await db.query("select count(*)::int n from public.recent_sections"))
      .rows[0].n,
    100,
  );
  await role(users[1]);
  for (const table of [
    "customer_profiles",
    "saved_sections",
    "recent_sections",
  ])
    assert.equal((await db.query(`select * from public.${table}`)).rowCount, 0);
  assert.equal(
    (
      await db.query("delete from public.saved_sections where user_id=$1", [
        users[0],
      ])
    ).rowCount,
    0,
  );
  await db.query("select public.record_recent($1)", [parent.id]);
  assert.equal(
    (await db.query("select count(*)::int n from public.recent_sections"))
      .rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select * from public.search_catalog('__customer_check_',null,0)",
      )
    ).rowCount,
    41,
  );
  assert.equal(
    (await db.query("select * from public.search_catalog('%',null,0)"))
      .rowCount,
    0,
  );
  await db.query("reset role");
  await db.query("rollback");
  console.log(
    "Verified RLS isolation, denied forged ownership, search pagination, and the 100-entry history bound. SQL test data rolled back.",
  );
  const { data: catalog, error: catalogError } = await clients[0]
    .from("catalog_sections")
    .select("id")
    .limit(1);
  assert.ifError(catalogError);
  assert.ok(catalog?.length);
  const item = catalog[0].id;
  const saves = await Promise.all(
    Array.from({ length: 6 }, () =>
      clients[0]
        .from("saved_sections")
        .upsert(
          { user_id: users[0], section_id: item },
          { onConflict: "user_id,section_id", ignoreDuplicates: true },
        ),
    ),
  );
  saves.forEach((r) => assert.ifError(r.error));
  const records = await Promise.all(
    Array.from({ length: 6 }, () =>
      clients[0].rpc("record_recent", { section: item }),
    ),
  );
  records.forEach((r) => assert.ifError(r.error));
  const { data: saved } = await clients[0].from("saved_sections").select("*");
  assert.equal(saved?.length, 1);
  const { data: other } = await clients[1].from("saved_sections").select("*");
  assert.equal(other?.length, 0);
  await clients[0]
    .from("customer_profiles")
    .insert({ user_id: users[0], display_name: "QA" });
  const session = await clients[0].auth.getSession();
  const unauthorized = await fetch(`${api}/api/account`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true }),
  });
  assert.equal(unauthorized.status, 401);
  const response = await fetch(`${api}/api/account`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.data.session!.access_token}`,
    },
    body: JSON.stringify({ confirm: true }),
  });
  assert.equal(response.status, 200, `Deletion returned ${response.status}`);
  const after = await admin.auth.admin.getUserById(users[0]);
  assert.ok(after.error);
  for (const table of [
    "customer_profiles",
    "saved_sections",
    "recent_sections",
  ]) {
    const r = await admin.from(table).select("*").eq("user_id", users[0]);
    assert.ifError(r.error);
    assert.equal(r.data?.length, 0);
  }
  console.log(
    "Six concurrent saves and recent writes passed without duplicates. Account deletion removed auth and all associated rows.",
  );
  assert.ifError((await admin.auth.admin.getUserById(users[1])).error);
  const counts = await admin
    .from("catalog_sections")
    .select("id", { count: "exact", head: true });
  console.log(`Catalog preserved (${counts.count} records).`);
} finally {
  await db.query("rollback").catch(() => {});
  await db.end().catch(() => {});
  for (const id of users) await admin.auth.admin.deleteUser(id);
}
