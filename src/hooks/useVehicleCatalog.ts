import { useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { supabase } from "../lib/supabase";
import { CATALOG_COLUMNS, type RootKey, type Section } from "../../shared/catalog";
import { useForegroundRefresh } from './useForegroundRefresh';
import { useBookmarkStore } from '../providers/BookmarksProvider';
export function useVehicleCatalog(
  vehicle: string | null,
  search = "",
  root: RootKey | null = null,
  folders = false,
  enabled = true,
  version = 0,
) {
  const [query, setQuery] = useState(search.trim());
  const loadingMore=useRef(false);
  const bookmarks=useBookmarkStore();
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
      }).select(CATALOG_COLUMNS);
      if (error) throw error;
      const rows = (data || []) as Section[];
      const sections = rows.slice(0, 40);
      return { sections, more: rows.length > 40, last: sections.at(-1) };
    },
    { revalidateFirstPage: false, revalidateIfStale: false },
  );
  const sections=useMemo(()=>result.data?.flatMap(p=>p.sections)||[],[result.data]);
  useEffect(() => {
    void bookmarks.refreshSections(sections).catch(()=>{});
  },[bookmarks,sections]);
  useForegroundRefresh(()=>result.mutate(),enabled&&!!vehicle);
  return {
    sections,
    loading: result.isLoading || result.isValidating,
    error: !!result.error,
    hasMore: result.data?.at(-1)?.more || false,
    refresh: () => result.mutate(),
    loadMore: async () => {
      if(loadingMore.current || result.isValidating || !result.data?.at(-1)?.more)return;
      loadingMore.current=true;
      try {await result.setSize(n=>n+1);}finally{loadingMore.current=false;}
    },
  };
}
