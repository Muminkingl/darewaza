import { useEffect, useState } from "react";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useGarage } from "../providers/GarageProvider";
import { useLanguage } from "../i18n";
import { supabase } from "../lib/supabase";
import {
  vehicleName,
  ruleName,
  type FitStatus,
  type VehicleRule,
} from "../../shared/vehicles";
import { Car, Check } from "./icons";
import { Tap } from "./Motion";
import { colors, font } from "../theme";
export function CompatibilityCard({
  section,
  onManage,
  revision = 0,
}: {
  section: string;
  onManage: () => void;
  revision?: number;
}) {
  const { t, row, align } = useLanguage();
  const { selected } = useGarage();
  const [expanded, setExpanded] = useState(false);
  const fit = useSWR(
    selected ? ["vehicle-fit", section, selected.id, selected.version] : null,
    async () => {
      const { data, error } = await supabase!.rpc("vehicle_fit_status", {
        section_uuid: section,
        vehicle_uuid: selected!.id,
      });
      if (error) throw error;
      return data as FitStatus;
    },
  );
  const rules = useSWRInfinite(
    (index, prev) =>
      !expanded || (prev && !prev.more)
        ? null
        : ["vehicle-rules", section, index, prev?.last ?? null],
    async (key) => {
      let query = supabase!
        .from("section_vehicle_rules")
        .select("*,model:vehicle_models(*)")
        .eq("section_id", section)
        .order("id")
        .limit(21);
      if (key[3]) query = query.gt("id", key[3]);
      const { data, error } = await query;
      if (error) throw error;
      const items = (data || []).slice(0, 20) as unknown as VehicleRule[];
      return { items, more: (data?.length || 0) > 20, last: items.at(-1)?.id };
    },
    { revalidateFirstPage: false, revalidateIfStale: false },
  );
  useEffect(() => {
    if (revision) {
      void fit.mutate();
      void rules.mutate();
    }
  }, [revision]);
  const matched = !!selected && !fit.error && fit.data === "matched";
  const label = !selected
    ? "selectCarHint"
    : fit.data === "matched"
      ? "fitMatched"
      : fit.data === "needs_details"
        ? "fitNeedsDetails"
        : fit.data === "not_listed"
          ? "fitNotListed"
          : "fitUnknown";
  return (
    <View style={s.card}>
      <View style={[row, s.heading]}>
        <Car size={21} color={colors.blue} />
        <Text style={[s.title, align]}>{t("compatibility")}</Text>
      </View>
      <Tap onPress={onManage} style={[s.vehicle, row]}>
        <Text style={[s.car, align, { flex: 1 }]}>
          {selected ? vehicleName(selected) : t("chooseCar")}
        </Text>
        <Text style={s.link}>{t("changeCar")}</Text>
      </Tap>
      {fit.isLoading ? (
        <ActivityIndicator size="small" color={colors.blue} />
      ) : (
        <View style={[row, s.status]}>
          {matched && <Check size={17} color="#4E8A76" />}
          <Text style={[s.statusText, align, matched && { color: "#4E8A76" }]}>
            {t(fit.error ? "networkError" : label)}
          </Text>
        </View>
      )}
      <Text style={[s.note, align]}>
        {t(fit.data === "needs_details" ? "fitNeedsNote" : "fitNote")}
      </Text>
      <Tap
        onPress={() => setExpanded(!expanded)}
        accessibilityState={{ expanded }}
      >
        <Text style={[s.link, align, { paddingVertical: 12 }]}>
          {t(expanded ? "close" : "listedVehicles")}
        </Text>
      </Tap>
      {expanded && (
        <View>
          {rules.data
            ?.flatMap((p) => p.items)
            .map((r) => (
              <View key={r.id} style={s.rule}>
                <Text style={[s.ruleTitle, align]}>{ruleName(r)}</Text>
                <Text style={[s.note, align]}>
                  {r.engine || t("anyEngine")} · {r.trim || t("anyTrim")}
                </Text>
              </View>
            ))}
          {rules.isLoading && <ActivityIndicator color={colors.blue} />}
          {!rules.isLoading &&
            !rules.error &&
            !rules.data?.[0]?.items.length && (
              <Text style={[s.note, align]}>{t("fitUnknown")}</Text>
            )}
          {rules.error && (
            <Tap onPress={() => void rules.mutate()}>
              <Text style={s.note}>
                {t("networkError")} · {t("retry")}
              </Text>
            </Tap>
          )}
          {rules.data?.at(-1)?.more && (
            <Tap
              disabled={rules.isValidating}
              onPress={() => void rules.setSize((n) => n + 1)}
            >
              <Text style={s.link}>{t("loadMore")}</Text>
            </Tap>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    padding: 19,
    borderWidth: 1,
    borderColor: "#E3EAF2",
    borderRadius: 22,
    backgroundColor: "#fff",
    marginTop: 16,
  },
  heading: { alignItems: "center", gap: 10 },
  title: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  vehicle: {
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F3F7F8",
    marginVertical: 14,
  },
  car: { fontFamily: font.medium, fontSize: 11, color: colors.ink },
  link: { fontFamily: font.medium, fontSize: 10, color: colors.blue },
  status: { alignItems: "center", gap: 8 },
  statusText: {
    fontFamily: font.medium,
    fontSize: 12,
    color: "#8D8778",
    flex: 1,
  },
  note: {
    fontFamily: font.regular,
    fontSize: 10,
    lineHeight: 24,
    color: colors.muted,
    marginTop: 5,
  },
  rule: { borderTopWidth: 1, borderColor: "#ECF0F4", paddingVertical: 13 },
  ruleTitle: { fontFamily: font.medium, fontSize: 12, color: colors.ink },
});
