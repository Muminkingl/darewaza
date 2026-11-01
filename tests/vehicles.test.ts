import { test } from "node:test";
import assert from "node:assert/strict";
import { vehicleMutation } from "../api/vehicles";
const rule = {
  kind: "rule",
  id: "f2263fbd-dd87-4e4c-9d90-c732f868d541",
  section_id: "2879afba-c4e5-484e-bc71-9640b0755049",
  model_id: "9336c08f-248f-40a2-8630-69d2eb1bdd3f",
  year_from: 2020,
  year_to: 2024,
};
test("vehicle compatibility rejects inverted year ranges and excessive detail", () => {
  assert.equal(
    vehicleMutation.safeParse({ ...rule, year_to: 2019 }).success,
    false,
  );
  assert.equal(
    vehicleMutation.safeParse({ ...rule, engine: "a".repeat(81) }).success,
    false,
  );
  assert.equal(
    vehicleMutation.safeParse({ ...rule, user_id: "spoof" }).success,
    false,
  );
  assert.equal(vehicleMutation.safeParse(rule).success, true);
});
test("vehicle models require real labels and reject extra authority fields", () => {
  assert.equal(
    vehicleMutation.safeParse({
      kind: "model",
      id: rule.id,
      make: " ",
      model: "Corolla",
    }).success,
    false,
  );
  assert.equal(
    vehicleMutation.safeParse({
      kind: "model",
      id: rule.id,
      make: "Toyota",
      model: "Corolla",
      admin: true,
    }).success,
    false,
  );
});
