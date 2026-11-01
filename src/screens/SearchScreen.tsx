import { useGarage } from "../providers/GarageProvider";
import { useVehicleCatalog } from "../hooks/useVehicleCatalog";
import { VehicleCard } from "../components/VehicleCard";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Search, X } from "../components/icons";
import { useCatalog } from "../hooks/useCatalog";
import { useLanguage } from "../i18n";
import { SectionList, EmptyState } from "../components/SectionList";
import { Tap } from "../components/Motion";
import { colors, font } from "../theme";
import type { RootKey, Section } from "../../shared/catalog";
export function SearchScreen({
  onOpen,
  onGarage,
}: {
  onOpen: (item: Section) => void;
  onGarage: () => void;
}) {
  const { t, row, align } = useLanguage();
  const [query, setQuery] = useState("");
  const [root, setRoot] = useState<RootKey | null>(null);
  const { selected } = useGarage();
  const [useVehicle, setUseVehicle] = useState(true);
  useEffect(() => setUseVehicle(true), [selected?.id]);
  const allData = useCatalog(
    root,
    null,
    useVehicle && selected ? "" : query,
    true,
  );
  const vehicleData = useVehicleCatalog(
    selected?.id || null,
    query,
    root,
    false,
    useVehicle && query.trim().length >= 2,
    selected?.version || 0,
  );
  const data = useVehicle && selected ? vehicleData : allData;
  const header = (
    <View style={s.heading}>
      <Text style={[s.title, align]}>{t("searchTitle")}</Text>
      <Text style={[s.subtitle, align]}>{t(useVehicle && selected ? "carPartsHint" : "searchSubtitle")}</Text>
      <VehicleCard compact onManage={onGarage} />
      {selected && (
        <View style={[s.filters, row]}>
          {([true, false] as const).map((value) => (
            <Tap
              key={String(value)}
              onPress={() => setUseVehicle(value)}
              style={[s.filter, useVehicle === value && s.active]}
              accessibilityState={{ selected: useVehicle === value }}
            >
              <Text
                style={[
                  s.filterText,
                  useVehicle === value && { color: "#fff" },
                ]}
              >
                {t(value ? "myCar" : "allVehicles")}
              </Text>
            </Tap>
          ))}
        </View>
      )}
      <View style={[s.search, row]}>
        <Search size={21} color="#8A9EB5" />
        <TextInput
          autoFocus={false}
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor="#98A6B7"
          style={[s.input, align]}
          maxLength={100}
          returnKeyType="search"
          accessibilityLabel={t("search")}
        />
        {!!query && (
          <Pressable
            accessibilityLabel={t("close")}
            accessibilityRole="button"
            onPress={() => setQuery("")}
            hitSlop={10}
          >
            <X size={19} color="#9AADBF" />
          </Pressable>
        )}
      </View>
      <View style={[s.filters, row]}>
        {([null, "parts", "accessories"] as const).map((key) => (
          <Tap
            key={key || "all"}
            onPress={() => setRoot(key)}
            accessibilityState={{ selected: root === key }}
            style={[s.filter, root === key && s.active]}
          >
            <Text style={[s.filterText, root === key && { color: "#fff" }]}>
              {t(key || "all")}
            </Text>
          </Tap>
        ))}
      </View>
    </View>
  );
  if (query.trim().length < 2)
    return (
      <View style={{ flex: 1 }}>
        <View style={s.standalone}>{header}</View>
        <EmptyState
          search
          title={t("typeToSearch")}
          hint={t("typeToSearchHint")}
        />
      </View>
    );
  return (
    <SectionList
      data={data}
      header={header}
      onOpen={onOpen}
      search
      emptyTitle={t("noResults")}
      emptyHint={t("noResultsHint")}
    />
  );
}
const s = StyleSheet.create({
  standalone: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 22,
  },
  heading: { paddingTop: 27, paddingBottom: 20 },
  title: { fontFamily: font.bold, fontSize: 24, color: colors.ink },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 25,
    marginTop: 6,
  },
  search: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E9F1",
    borderRadius: 17,
    minHeight: 57,
    paddingHorizontal: 15,
    alignItems: "center",
    gap: 10,
    marginTop: 23,
  },
  input: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 12,
    color: colors.ink,
    paddingVertical: 12,
    minWidth: 0,
  },
  filters: { gap: 8, marginTop: 16, flexWrap: "wrap" },
  filter: {
    paddingHorizontal: 17,
    paddingVertical: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E9F1",
    backgroundColor: "#fff",
  },
  active: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterText: { fontFamily: font.medium, fontSize: 11, color: "#7F94AC" },
});
