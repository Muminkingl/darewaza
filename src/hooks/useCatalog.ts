import { useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { supabase } from "../lib/supabase";
import { CATALOG_COLUMNS, PAGE_SIZE, type RootKey, type Section } from "../../shared/catalog";
import { useForegroundRefresh } from './useForegroundRefresh';
import { useBookmarkStore } from '../providers/BookmarksProvider';

export function useCatalog(
  root: RootKey | null,
  parent: string | null,
  search: string,
  global = false,
) {
  const [query, setQuery] = useState(search.trim());
  const bookmarks=useBookmarkStore();
  const loadingMore=useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const enabled = global ? query.length >= 2 : !!root;
  const result = useSWRInfinite(
    (index, previous) =>
      !enabled || (previous && !previous.more)
        ? null
        : ["catalog", global ? "search" : "browse", root, parent, query, index],
    async (key) => {
      const offset = (key[5] as number) * PAGE_SIZE;
      let result;
      if (global)
        result = await supabase!.rpc("search_catalog", {
          query_text: query,
          root_filter: root,
          page_offset: offset,
        }).select(CATALOG_COLUMNS);
      else {
        let q = supabase!
          .from("catalog_sections")
          .select(CATALOG_COLUMNS)
          .eq("root_key", root!)
          .order("position")
          .order("created_at")
          .order("id")
          .range(offset, offset + PAGE_SIZE);
        q = parent ? q.eq("parent_id", parent) : q.is("parent_id", null);
        if (query) q = q.ilike("search_name", `%${query.replace(/[\\%_]/g, "\\$&")}%`);
        result = await q;
      }
      if (result.error) throw result.error;
      const rows = (result.data || []) as Section[];
      return {
        sections: rows.slice(0, PAGE_SIZE),
        more: rows.length > PAGE_SIZE,
      };
    },
    { revalidateFirstPage: false, revalidateIfStale: false },
  );
  const sections=useMemo(()=>result.data?.flatMap(p=>p.sections)||[],[result.data]);
  useEffect(() => {
    void bookmarks.refreshSections(sections).catch(()=>{});
  },[bookmarks,sections]);
  useForegroundRefresh(()=>result.mutate(),enabled);
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
