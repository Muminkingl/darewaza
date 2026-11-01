import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../i18n";
import { useGarage } from "../providers/GarageProvider";
import { useVehicleCatalog } from "../hooks/useVehicleCatalog";
import { VehicleCard } from "../components/VehicleCard";
import { SectionList } from "../components/SectionList";
import { Tap } from "../components/Motion";
import { colors, font } from "../theme";
import type { RootKey, Section } from "../../shared/catalog";
export function VehicleCatalogScreen({
  onOpen,
  onManage,
  onAll,
}: {
  onOpen: (s: Section) => void;
  onManage: () => void;
  onAll: () => void;
}) {
  const { t, row, align } = useLanguage();
  const { selected } = useGarage();
  const [folders, setFolders] = useState(true);
  const [root, setRoot] = useState<RootKey | null>(null);
  const data = useVehicleCatalog(
    selected?.id || null,
    "",
    root,
    folders,
    true,
    selected?.version || 0,
  );
  const header = (
    <View style={s.header}>
      <Text style={[s.title, align]}>{t("myCar")}</Text>
      <VehicleCard compact onManage={onManage} />
      <View style={[s.tabs, row]}>
        {([true, false] as const).map((value) => (
          <Tap
            key={String(value)}
            onPress={() => setFolders(value)}
            accessibilityState={{ selected: folders === value }}
            style={[s.tab, folders === value && s.active]}
          >
            <Text style={[s.tabText, folders === value && { color: "#fff" }]}>
              {t(value ? "carFolders" : "carParts")}
            </Text>
          </Tap>
        ))}
      </View>
      <Text style={[s.hint, align]}>
        {t(folders ? "carFoldersHint" : "carPartsHint")}
      </Text>
      <View style={[s.tabs, row]}>
        {([null, "parts", "accessories"] as const).map((key) => (
          <Tap
            key={key || "all"}
            onPress={() => setRoot(key)}
            style={[s.filter, root === key && { backgroundColor: "#E1EBF4" }]}
            accessibilityState={{ selected: root === key }}
          >
            <Text style={s.filterText}>{t(key || "all")}</Text>
          </Tap>
        ))}
      </View>
      <Tap style={s.all} onPress={onAll}>
        <Text style={s.filterText}>{t("allVehicles")}</Text>
      </Tap>
    </View>
  );
  return (
    <SectionList
      data={data}
      onOpen={onOpen}
      header={header}
      emptyTitle={t(
        selected ? (folders ? "noCarFolders" : "noCarParts") : "chooseCar",
      )}
      emptyHint={t("browseAllHint")}
    />
  );
}
const s = StyleSheet.create({
  header: { paddingTop: 22, paddingBottom: 10 },
  title: {
    fontFamily: font.bold,
    fontSize: 25,
    color: colors.ink,
    marginBottom: 17,
  },
  tabs: { gap: 7, marginBottom: 12, flexWrap: "wrap" },
  tab: {
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#EAF0F6",
  },
  active: { backgroundColor: colors.navy },
  tabText: { fontFamily: font.medium, fontSize: 11, color: colors.blue },
  hint: {
    fontFamily: font.regular,
    fontSize: 11,
    lineHeight: 25,
    color: colors.muted,
    marginBottom: 13,
  },
  filter: { borderRadius: 10, padding: 10, backgroundColor: "#F0F4F8" },
  filterText: { fontFamily: font.medium, fontSize: 10, color: colors.blue },
  all: { alignItems: "center", padding: 18 },
});
