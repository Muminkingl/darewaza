import { useEffect, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { PAGE_SIZE, type RootKey, type Section } from "../../shared/catalog";

export function useCatalog(
  root: RootKey | null,
  parent: string | null,
  search: string,
  global = false,
) {
  const [query, setQuery] = useState(search.trim());
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
        });
      else {
        let q = supabase!
          .from("catalog_sections")
          .select("*")
          .eq("root_key", root!)
          .order("position")
          .order("created_at")
          .order("id")
          .range(offset, offset + PAGE_SIZE);
        q = parent ? q.eq("parent_id", parent) : q.is("parent_id", null);
        if (query) q = q.ilike("name", `%${query.replace(/[\\%_]/g, "\\$&")}%`);
        result = await q;
      }
      if (result.error) throw result.error;
      const rows = (result.data || []) as Section[];
      return {
        sections: rows.slice(0, PAGE_SIZE),
        more: rows.length > PAGE_SIZE,
      };
    },
    { revalidateFirstPage: true },
  );
  useEffect(() => {
    const l = AppState.addEventListener("change", (state) => {
      if (state === "active" && enabled) void result.mutate();
    });
    return () => l.remove();
  }, [enabled, result.mutate]);
  return {
    sections: result.data?.flatMap((p) => p.sections) || [],
    loading: result.isLoading || result.isValidating,
    error: !!result.error,
    hasMore: result.data?.at(-1)?.more || false,
    refresh: () => result.mutate(),
    loadMore: () => result.setSize((n) => n + 1),
  };
}
