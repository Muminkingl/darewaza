export interface VehicleModel {
  id: string;
  make: string;
  model: string;
  active: boolean;
  version: number;
}
export interface MyVehicle {
  id: string;
  model_id: string;
  year: number;
  engine: string;
  trim: string;
  nickname: string;
  version: number;
  model: VehicleModel;
}
export interface VehicleRule {
  id: string;
  section_id: string;
  model_id: string;
  year_from: number;
  year_to: number;
  engine: string;
  trim: string;
  version: number;
  model: VehicleModel;
}
export type FitStatus = "matched" | "needs_details" | "not_listed" | "unknown";
export const vehicleName = (v: MyVehicle) =>
  `${v.model.make} ${v.model.model} · ${v.year}`;
export const ruleName = (r: VehicleRule) =>
  `${r.model.make} ${r.model.model} · ${r.year_from}–${r.year_to}`;
