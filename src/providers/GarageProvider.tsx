import { createContext, useContext, type ReactNode } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRInfinite, { unstable_serialize } from "swr/infinite";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import type { MyVehicle } from "../../shared/vehicles";
import { useForegroundRefresh } from '../hooks/useForegroundRefresh';
export type VehicleDraft = {
  id: string;
  model_id: string;
  year: number;
  engine: string;
  trim: string;
  nickname: string;
  version?: number;
};
type Value = {
  selected: MyVehicle | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<unknown>;
  select: (vehicle: MyVehicle | null) => Promise<void>;
  save: (draft: VehicleDraft) => Promise<void>;
  remove: (vehicle: MyVehicle) => Promise<void>;
};
const Context = createContext<Value>(null!);
export function GarageProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const user = session!.user.id;
  const { mutate } = useSWRConfig();
  const selection = useSWR(["garage-selection", user], async () => {
    const { data, error } = await supabase!
      .from("garage_preferences")
      .select(
        "vehicle:customer_vehicles!garage_selected_vehicle_fk(*,model:vehicle_models(*))",
      )
      .eq("user_id", user)
      .maybeSingle();
    if (error) throw error;
    return (data?.vehicle || null) as unknown as MyVehicle | null;
  });
  const refreshCars = () =>
    mutate(unstable_serialize(() => ["garage-cars", user, 0]));
  useForegroundRefresh(()=>selection.mutate());
  return (
    <Context.Provider
      value={{
        selected: selection.data || null,
        loading: selection.isLoading,
        error: !!selection.error,
        refresh: () => selection.mutate(),
        select: async (vehicle) => {
          await selection.mutate(
            async () => {
              const { error } = await supabase!.rpc("select_my_vehicle", {
                vehicle_id: vehicle?.id || null,
              });
              if (error) throw error;
              return vehicle;
            },
            {
              optimisticData: vehicle,
              rollbackOnError: true,
              revalidate: true,
            },
          );
        },
        save: async (v) => {
          const { error } = await supabase!.rpc("save_my_vehicle", {
            vehicle_id: v.id,
            vehicle_model: v.model_id,
            vehicle_year: v.year,
            vehicle_engine: v.engine.trim(),
            vehicle_trim: v.trim.trim(),
            vehicle_nickname: v.nickname.trim(),
            expected_version: v.version ?? null,
          });
          if (error) throw error;
          await Promise.all([selection.mutate(), refreshCars()]);
        },
        remove: async (v) => {
          const { data, error } = await supabase!
            .from("customer_vehicles")
            .delete()
            .eq("id", v.id)
            .eq("user_id", user)
            .eq("version", v.version)
            .select("id");
          if (error) throw error;
          if (!data.length) throw new Error("conflict");
          await Promise.all([selection.mutate(), refreshCars()]);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useGarage = () => useContext(Context);
export function useMyVehicles() {
  const { session } = useAuth();
  const result = useSWRInfinite(
    (index, previous) =>
      previous && !previous.more
        ? null
        : ["garage-cars", session!.user.id, index],
    async (key) => {
      const page = key[2] as number;
      const { data, error } = await supabase!
        .from("customer_vehicles")
        .select("*,model:vehicle_models(*)")
        .eq("user_id", session!.user.id)
        .order("created_at")
        .order("id")
        .range(page * 30, page * 30 + 30);
      if (error) throw error;
      return {
        items: (data || []).slice(0, 30) as unknown as MyVehicle[],
        more: (data?.length || 0) > 30,
      };
    },
    { revalidateFirstPage: false, revalidateIfStale: false },
  );
  return {
    items: result.data?.flatMap((p) => p.items) || [],
    loading: result.isLoading || result.isValidating,
    error: !!result.error,
    more: result.data?.at(-1)?.more,
    refresh: () => result.mutate(),
    loadMore: () => result.setSize((n) => n + 1),
  };
}
