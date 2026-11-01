import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { rootCertificates } from "node:tls";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const users: string[] = [];
let cascadeModel: string | undefined;
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
try {
  for (let i = 0; i < 2; i++) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `vehicle-qa-${randomUUID()}@example.com`,
      password: randomUUID() + "A!",
      email_confirm: true,
    });
    assert.ifError(error);
    users.push(data.user!.id);
  }
  await db.connect();
  await db.query("begin");
  async function role(user: string) {
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: user, role: "authenticated" }),
    ]);
    await db.query("set local role authenticated");
  }
  async function denied(sql: string, values: unknown[] = [], code = "42501") {
    await db.query("savepoint forbidden");
    let actual;
    try {
      await db.query(sql, values);
    } catch (e) {
      actual = (e as { code: string }).code;
    }
    await db.query("rollback to savepoint forbidden");
    assert.equal(actual, code);
  }
  const model = (
    await db.query(
      "insert into public.vehicle_models(make,model)values('__vehicle_qa__','Model')returning id",
    )
  ).rows[0].id;
  const folder = (
    await db.query(
      "insert into public.catalog_sections(root_key,name)values('parts','__vehicle_qa__')returning id",
    )
  ).rows[0].id;
  const product = (
    await db.query(
      "insert into public.catalog_sections(root_key,parent_id,name,is_terminal,price_usd)values('parts',$1,'__vehicle_qa__',true,1)returning id",
      [folder],
    )
  ).rows[0].id;
  const unknown = (
    await db.query(
      "insert into public.catalog_sections(root_key,name,is_terminal,price_usd)values('parts','__unknown_qa__',true,1)returning id",
    )
  ).rows[0].id;
  await db.query(
    "insert into public.section_vehicle_rules(section_id,model_id,year_from,year_to,engine,trim)values($1,$2,2020,2025,'1.5L','Premium'),($3,$2,1900,2100,'','')",
    [product, model, folder],
  );
  const car = randomUUID();
  await role(users[0]);
  await db.query("select public.save_my_vehicle($1,$2,2022,'','','',null)", [
    car,
    model,
  ]);
  // A retried creation has one car and one preference; no duplicate writes.
  await db.query("select public.save_my_vehicle($1,$2,2022,'','','',null)", [
    car,
    model,
  ]);
  assert.equal(
    (await db.query("select count(*)::int n from public.customer_vehicles"))
      .rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select selected_vehicle_id from public.garage_preferences",
      )
    ).rows[0].selected_vehicle_id,
    car,
  );
  async function status(id: string) {
    return (
      await db.query("select public.vehicle_fit_status($1,$2) s", [id, car])
    ).rows[0].s;
  }
  assert.equal(await status(product), "needs_details");
  assert.equal(await status(folder), "unknown");
  assert.equal(await status(unknown), "unknown");
  assert.equal(
    (await db.query("select id from public.vehicle_catalog($1)", [car]))
      .rowCount,
    1,
  );
  assert.equal(
    (
      await db.query("select id from public.vehicle_catalog($1,'',null,true)", [
        car,
      ])
    ).rows[0].id,
    folder,
  );
  await db.query(
    "select public.save_my_vehicle($1,$2,2022,'1.5l','premium','Daily',1)",
    [car, model],
  );
  assert.equal(await status(product), "matched");
  await denied(
    "select public.save_my_vehicle($1,$2,2022,'2L','','',1)",
    [car, model],
    "40001",
  );
  await db.query(
    "select public.save_my_vehicle($1,$2,2022,'2L','Premium','',2)",
    [car, model],
  );
  assert.equal(await status(product), "not_listed");
  assert.equal(
    (await db.query("select id from public.vehicle_catalog($1)", [car]))
      .rowCount,
    0,
  );
  await db.query(
    "select public.save_my_vehicle($1,$2,2019,'1.5L','Premium','',3)",
    [car, model],
  );
  assert.equal(await status(product), "not_listed");
  await denied(
    "insert into public.vehicle_models(make,model) values('Spoof','Model')",
  );
  await denied(
    "insert into public.section_vehicle_rules(section_id,model_id,year_from,year_to)values($1,$2,2020,2025)",
    [product, model],
  );
  await denied("update public.customer_vehicles set year=2024 where id=$1", [
    car,
  ]);
  await role(users[1]);
  assert.equal(
    (await db.query("select * from public.customer_vehicles")).rowCount,
    0,
  );
  assert.equal(
    (await db.query("select * from public.garage_preferences")).rowCount,
    0,
  );
  assert.equal(
    (
      await db.query(
        "delete from public.customer_vehicles where id=$1 returning id",
        [car],
      )
    ).rowCount,
    0,
  );
  await denied("select public.select_my_vehicle($1)", [car]);
  await denied("select public.save_my_vehicle($1,$2,2022,'','','',null)", [
    car,
    model,
  ]);
  assert.equal(
    (await db.query("select id from public.vehicle_catalog($1)", [car]))
      .rowCount,
    0,
  );
  assert.equal(await status(product), "unknown");
  await db.query("reset role");
  // Forty-one bounded results; cursor pages neither repeat nor omit equal names.
  await db.query(
    "insert into public.catalog_sections(root_key,name,is_terminal,price_usd) select 'parts','__page_qa__',true,1 from generate_series(1,85)",
  );
  await db.query(
    "insert into public.section_vehicle_rules(section_id,model_id,year_from,year_to)select id,$1,1900,2100 from public.catalog_sections where name='__page_qa__'",
    [model],
  );
  await role(users[0]);
  const first = (
    await db.query(
      "select id,name from public.vehicle_catalog($1,'__page_qa__')",
      [car],
    )
  ).rows;
  assert.equal(first.length, 41);
  const cursor = first[39];
  const second = (
    await db.query(
      "select id,name from public.vehicle_catalog($1,'__page_qa__',null,false,$2,$3)",
      [car, cursor.name, cursor.id],
    )
  ).rows;
  assert.equal(second.length, 41);
  assert.equal(
    new Set([...first.slice(0, 40), ...second.slice(0, 40)].map((v) => v.id))
      .size,
    80,
  );
  await db.query("delete from public.customer_vehicles where id=$1", [car]);
  assert.equal(
    (
      await db.query(
        "select selected_vehicle_id from public.garage_preferences",
      )
    ).rows[0].selected_vehicle_id,
    null,
  );
  await db.query("reset role");
  await db.query("set local role anon");
  await denied("select * from public.vehicle_models");
  await denied("select public.vehicle_fit_status($1,$2)", [product, car]);
  await db.query("reset role");
  await db.query("rollback");
  cascadeModel = (
    await db.query(
      "insert into public.vehicle_models(make,model)values($1,'Cascade')returning id",
      [`__cascade_${randomUUID()}`],
    )
  ).rows[0].id;
  const ownedCar = (
    await db.query(
      "insert into public.customer_vehicles(user_id,model_id,year)values($1,$2,2022)returning id",
      [users[0], cascadeModel],
    )
  ).rows[0].id;
  await db.query(
    "insert into public.garage_preferences(user_id,selected_vehicle_id)values($1,$2)",
    [users[0], ownedCar],
  );
  const deletion = await admin.auth.admin.deleteUser(users[0]);
  assert.ifError(deletion.error);
  assert.equal(
    (
      await db.query(
        "select * from public.customer_vehicles where user_id=$1",
        [users[0]],
      )
    ).rowCount,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select * from public.garage_preferences where user_id=$1",
        [users[0]],
      )
    ).rowCount,
    0,
  );
  console.log(
    "Vehicle checks passed: ownership/RLS, model permissions, idempotency, stale edits, missing details, exact matches, year/engine mismatch, folder isolation, cursor paging and selected-car deletion.",
  );
} finally {
  await db.query("rollback").catch(() => {});
  await db.end();
  for (const id of users) await admin.auth.admin.deleteUser(id);
  if (cascadeModel)
    await admin.from("vehicle_models").delete().eq("id", cascadeModel);
}
