import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, HttpError } from "../server/auth.js";
import { database } from "../server/database.js";
import { fail } from "../server/http.js";

const id = z.uuid();
const modelFields = {
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  active: z.boolean().default(true),
};
const ruleFields = {
  section_id: id,
  model_id: id,
  year_from: z.number().int().min(1900).max(2100),
  year_to: z.number().int().min(1900).max(2100),
  engine: z.string().trim().max(80).default(""),
  trim: z.string().trim().max(80).default(""),
};
export const vehicleMutation = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("model"),
      id,
      version: z.number().int().positive().optional(),
      ...modelFields,
    })
    .strict(),
  z
    .object({
      kind: z.literal("rule"),
      id,
      version: z.number().int().positive().optional(),
      ...ruleFields,
    })
    .strict()
    .refine((v) => v.year_to >= v.year_from, {
      message: "ساڵی کۆتایی نابێت کەمتر بێت لە ساڵی سەرەتا.",
    }),
]);
const ruleSelect = `select r.*,json_build_object('id',m.id,'make',m.make,'model',m.model,'active',m.active,'version',m.version) as model from public.section_vehicle_rules r join public.vehicle_models m on m.id=r.model_id`;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  response.setHeader("Cache-Control", "no-store");
  try {
    authenticate(request.headers.authorization);
    const db = database();
    if (request.method === "GET") {
      const q = z
        .object({
          section: id.optional(),
          q: z.string().trim().max(100).default(""),
          offset: z.coerce.number().int().min(0).max(2147483600).default(0),
        })
        .parse(request.query);
      const result = q.section
        ? await db.query(
            `${ruleSelect} where r.section_id=$1 order by r.id limit 41 offset $2`,
            [q.section, q.offset],
          )
        : await db.query(
            `select * from public.vehicle_models where $1='' or (make || ' ' || model) ilike $2 order by make,model,id limit 41 offset $3`,
            [q.q, `%${q.q.replace(/[\\%_]/g, "\\$&")}%`, q.offset],
          );
      return response.json({
        items: result.rows.slice(0, 40),
        more: result.rows.length > 40,
      });
    }
    if (request.method === "POST" || request.method === "PATCH") {
      const v = vehicleMutation.parse(request.body);
      if (request.method === "PATCH" && !v.version)
        throw new HttpError(400, "Version is required.");
      let row: Record<string, unknown> | undefined;
      if (v.kind === "model") {
        const values = [v.make, v.model, v.active, v.id];
        const result =
          request.method === "POST"
            ? await db.query(
                `insert into public.vehicle_models(make,model,active,id) values($1,$2,$3,$4) on conflict(id) do nothing returning *`,
                values,
              )
            : await db.query(
                `update public.vehicle_models set make=$1,model=$2,active=$3,version=version+1 where id=$4 and version=$5 returning *`,
                [...values, v.version],
              );
        row = result.rows[0];
        if (!row && request.method === "POST") {
          row = (
            await db.query("select * from public.vehicle_models where id=$1", [
              v.id,
            ])
          ).rows[0];
          if (
            !row ||
            row.make !== v.make ||
            row.model !== v.model ||
            row.active !== v.active
          )
            throw new HttpError(409, "ئەم ناسنامەیە پێشتر بەکارهاتووە.");
        }
      } else {
        const values = [
          v.section_id,
          v.model_id,
          v.year_from,
          v.year_to,
          v.engine,
          v.trim,
          v.id,
        ];
        const result =
          request.method === "POST"
            ? await db.query(
                `insert into public.section_vehicle_rules(section_id,model_id,year_from,year_to,engine,trim,id)
        select $1,$2,$3,$4,$5,$6,$7 where exists(select 1 from public.vehicle_models where id=$2 and active)
        on conflict(id) do nothing returning id`,
                values,
              )
            : await db.query(
                `update public.section_vehicle_rules r set model_id=$2,year_from=$3,year_to=$4,engine=$5,trim=$6,version=version+1
        where r.id=$7 and r.section_id=$1 and r.version=$8 and exists(select 1 from public.vehicle_models where id=$2 and (active or id=r.model_id)) returning r.id`,
                [...values, v.version],
              );
        if (result.rowCount)
          row = (await db.query(`${ruleSelect} where r.id=$1`, [v.id])).rows[0];
        else if (request.method === "POST") {
          row = (await db.query(`${ruleSelect} where r.id=$1`, [v.id])).rows[0];
          if (
            !row ||
            ![
              "section_id",
              "model_id",
              "year_from",
              "year_to",
              "engine",
              "trim",
            ].every((k) => row![k] === v[k as keyof typeof v])
          )
            throw new HttpError(
              409,
              "مۆدێلەکە ناچالاکە یان زانیارییەکان گۆڕاون. نوێ بکەرەوە.",
            );
        }
      }
      if (!row)
        throw new HttpError(
          409,
          "بەڕێوەبەرێکی دیکە ئەمەی گۆڕیوە. داخە و نوێ بکەرەوە.",
        );
      return response
        .status(request.method === "POST" ? 201 : 200)
        .json({ item: row });
    }
    if (request.method === "DELETE") {
      const v = z
        .object({
          id,
          version: z.number().int().positive(),
          kind: z.literal("rule"),
        })
        .strict()
        .parse(request.body);
      const result = await db.query(
        "delete from public.section_vehicle_rules where id=$1 and version=$2 returning id",
        [v.id, v.version],
      );
      if (!result.rowCount)
        throw new HttpError(
          409,
          "ئەم پەیوەندییە گۆڕاوە یان سڕاوەتەوە. نوێ بکەرەوە.",
        );
      return response.json({ deleted: v.id });
    }
    response.setHeader("Allow", "GET, POST, PATCH, DELETE");
    throw new HttpError(405, "Method not allowed.");
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      return response
        .status(409)
        .json({ error: "ئەم مۆدێلە یان پەیوەندییە پێشتر تۆمار کراوە." });
    return fail(response, error);
  }
}
