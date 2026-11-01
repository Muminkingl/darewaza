import { useEffect, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import type { RootKey, Section } from "../../shared/catalog";
export function useVehicleCatalog(
  vehicle: string | null,
  search = "",
  root: RootKey | null = null,
  folders = false,
  enabled = true,
  version = 0,
) {
  const [query, setQuery] = useState(search.trim());
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const result = useSWRInfinite(
    (index, previous) =>
      !vehicle || !enabled || (previous && !previous.more)
        ? null
        : [
            "vehicle-catalog",
            vehicle,
            query,
            root,
            folders,
            index,
            previous?.last?.name ?? null,
            previous?.last?.id ?? null,
            version,
          ],
    async (key) => {
      const { data, error } = await supabase!.rpc("vehicle_catalog", {
        vehicle_uuid: vehicle,
        query_text: query,
        root_filter: root,
        folders,
        after_name: key[6],
        after_id: key[7],
      });
      if (error) throw error;
      const sections = ((data || []) as Section[]).slice(0, 40);
      return { sections, more: data.length > 40, last: sections.at(-1) };
    },
    { revalidateFirstPage: true },
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active" && enabled && vehicle) void result.mutate();
    });
    return () => listener.remove();
  }, [result.mutate, enabled, vehicle]);
  return {
    sections: result.data?.flatMap((p) => p.sections) || [],
    loading: result.isLoading || result.isValidating,
    error: !!result.error,
    hasMore: result.data?.at(-1)?.more || false,
    refresh: () => result.mutate(),
    loadMore: () => result.setSize((n) => n + 1),
  };
}
