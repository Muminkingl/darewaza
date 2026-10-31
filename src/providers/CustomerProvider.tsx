import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import useSWR, { SWRConfig, useSWRConfig } from "swr";
import useSWRInfinite, { unstable_serialize } from "swr/infinite";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import { useLanguage, type Locale } from "../i18n";
import type { Section } from "../../shared/catalog";

type Profile = { display_name: string; locale: Locale };
type Value = {
  profile: Profile | undefined;
  saveProfile: (name: string) => Promise<void>;
  changeLanguage: (locale: Locale) => Promise<void>;
  toggleSave: (section: Section, current: boolean) => Promise<void>;
  overrides: Map<string, boolean>;
  busy: Set<string>;
};
const Context = createContext<Value>(null!);
export function CustomerProvider({ children }: { children: ReactNode }) {
  const cache = useMemo(() => new Map(), []);
  return (
    <SWRConfig
      value={{
        provider: () => cache,
        dedupingInterval: 15000,
        focusThrottleInterval: 30000,
        errorRetryCount: 1,
        errorRetryInterval: 3000,
        revalidateOnFocus: true,
        keepPreviousData: false,
      }}
    >
      <CustomerState>{children}</CustomerState>
    </SWRConfig>
  );
}
function CustomerState({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const user = session!.user;
  const { setLocale, locale } = useLanguage();
  const { mutate } = useSWRConfig();
  const [overrides, setOverrides] = useState(new Map<string, boolean>());
  const [busy, setBusy] = useState(new Set<string>());
  const pending = useMemo(() => new Set<string>(), []);
  const { data: profile, mutate: mutateProfile } = useSWR(
    ["profile", user.id],
    async () => {
      const { data, error } = await supabase!
        .from("customer_profiles")
        .select("display_name,locale")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  );
  const refreshCollection = () =>
    mutate(unstable_serialize(() => ["collection", user.id, "saved", 0]));
  useEffect(() => {
    if (profile?.locale) setLocale(profile.locale);
  }, [profile?.locale]);
  useEffect(() => {
    let wasBackground = false;
    const l = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        wasBackground = true;
        return;
      }
      if (wasBackground) {
        wasBackground = false;
        void refreshCollection();
        void mutate(
          (key) =>
            Array.isArray(key) &&
            ["profile", "counts", "membership", "product"].includes(key[0]),
          undefined,
          { revalidate: true },
        );
      }
    });
    return () => l.remove();
  }, [mutate]);
  async function updateProfile(values: Profile) {
    const payload = { ...values, updated_at: new Date().toISOString() };
    let result = profile
      ? await supabase!
          .from("customer_profiles")
          .update(payload)
          .eq("user_id", user.id)
      : await supabase!
          .from("customer_profiles")
          .insert({ user_id: user.id, ...payload });
    if (result.error?.code === "23505")
      result = await supabase!
        .from("customer_profiles")
        .update(payload)
        .eq("user_id", user.id);
    if (result.error) throw result.error;
    await mutateProfile(values, { revalidate: false });
  }
  async function toggleSave(section: Section, current: boolean) {
    if (pending.has(section.id)) return;
    pending.add(section.id);
    setBusy(new Set(pending));
    setOverrides((previous) => new Map(previous).set(section.id, !current));
    try {
      const result = current
        ? await supabase!
            .from("saved_sections")
            .delete()
            .eq("user_id", user.id)
            .eq("section_id", section.id)
        : await supabase!
            .from("saved_sections")
            .upsert(
              { user_id: user.id, section_id: section.id },
              { onConflict: "user_id,section_id", ignoreDuplicates: true },
            );
      if (result.error) throw result.error;
      await Promise.all([
        refreshCollection(),
        mutate(
          (key) =>
            Array.isArray(key) && ["counts", "membership"].includes(key[0]),
          undefined,
          { revalidate: true },
        ),
      ]);
      setOverrides((previous) => {
        const next = new Map(previous);
        next.delete(section.id);
        return next;
      });
    } catch (e) {
      setOverrides((previous) => new Map(previous).set(section.id, current));
      throw e;
    } finally {
      pending.delete(section.id);
      setBusy(new Set(pending));
    }
  }
  return (
    <Context.Provider
      value={{
        profile: profile || undefined,
        saveProfile: (name) =>
          updateProfile({ display_name: name.trim(), locale }),
        changeLanguage: async (next) => {
          setLocale(next);
          await updateProfile({
            display_name: profile?.display_name || "",
            locale: next,
          });
        },
        toggleSave,
        overrides,
        busy,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useCustomer = () => useContext(Context);
export function useMembership(sections: Section[]) {
  const { session } = useAuth();
  const { overrides } = useCustomer();
  const ids = sections.map((s) => s.id).sort();
  const { data } = useSWR(
    ids.length ? ["membership", session!.user.id, ...ids] : null,
    async () => {
      const { data, error } = await supabase!
        .from("saved_sections")
        .select("section_id")
        .eq("user_id", session!.user.id)
        .in("section_id", ids);
      if (error) throw error;
      return new Set((data || []).map((v) => v.section_id as string));
    },
  );
  return (id: string) =>
    overrides.has(id) ? overrides.get(id)! : data?.has(id) || false;
}
export function useSavedSections() {
  const { session } = useAuth();
  const result = useSWRInfinite(
    (index, previous) =>
      previous && !previous.more
        ? null
        : ["collection", session!.user.id, "saved", index],
    async (key) => {
      const page = key[3] as number;
      const { data, error } = await supabase!
        .from("saved_sections")
        .select(`section:catalog_sections!inner(*)`)
        .eq("user_id", session!.user.id)
        .order("saved_at", { ascending: false })
        .order("section_id")
        .range(page * 30, page * 30 + 30);
      if (error) throw error;
      const rows = (data || []) as unknown as { section: Section }[];
      return {
        sections: rows.slice(0, 30).map((v) => v.section),
        more: rows.length > 30,
      };
    },
    { revalidateFirstPage: true, revalidateAll: true, revalidateOnMount: true },
  );
  return {
    sections: result.data?.flatMap((p) => p.sections) || [],
    loading: result.isLoading || result.isValidating,
    error: !!result.error,
    hasMore: result.data?.at(-1)?.more || false,
    refresh: () => result.mutate(),
    loadMore: () => result.setSize((n) => n + 1),
  };
}
export function useCounts() {
  const { session } = useAuth();
  return useSWR(["counts", session!.user.id], async () => {
    const { count, error } = await supabase!
      .from("saved_sections")
      .select("section_id", { count: "exact", head: true })
      .eq("user_id", session!.user.id);
    if (error) throw error;
    return { saved: count || 0 };
  });
}
