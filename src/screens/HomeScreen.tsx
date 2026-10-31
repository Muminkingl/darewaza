import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, ArrowRight, Bookmark, History } from "../components/icons";
import { useLanguage } from "../i18n";
import { CatalogArt } from "../components/CatalogArt";
import { Tap } from "../components/Motion";
import { useCollection, useCounts } from "../providers/CustomerProvider";
import { colors, font } from "../theme";
import type { RootKey, Section } from "../../shared/catalog";
export function HomeScreen({
  onRoot,
  onOpen,
  onTab,
}: {
  onRoot: (key: RootKey) => void;
  onOpen: (item: Section) => void;
  onTab: (tab: "saved" | "recent") => void;
}) {
  const { t, row, align, rtl } = useLanguage();
  const { data: counts } = useCounts();
  const recent = useCollection("recent");
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <ScrollView
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 23 }}>
        <Text style={[s.eyebrow, align]}>{t("forYourCar")}</Text>
        <Text style={[s.title, align]}>{t("homeTitle")}</Text>
        <Text style={[s.subtitle, align]}>{t("homeSubtitle")}</Text>
      </View>
      {(["parts", "accessories"] as const).map((key) => (
        <Tap
          key={key}
          onPress={() => onRoot(key)}
          style={[s.card, key === "accessories" && s.accessory, row]}
        >
          <View style={s.copy}>
            <Text
              style={[
                s.tag,
                align,
                key === "accessories" && { color: "#A38A64" },
              ]}
            >
              {t(key === "parts" ? "essentials" : "personalTouch")}
            </Text>
            <Text style={[s.cardTitle, align]}>{t(key)}</Text>
            <Text style={[s.cardDescription, align]}>
              {t(key === "parts" ? "partsSubtitle" : "accessoriesSubtitle")}
            </Text>
            <View style={[s.cta, row]}>
              <Text
                style={[
                  s.ctaText,
                  key === "accessories" && { color: "#9C805B" },
                ]}
              >
                {t("explore")}
              </Text>
              <Arrow
                size={16}
                color={key === "parts" ? colors.blue : "#9C805B"}
              />
            </View>
          </View>
          <View pointerEvents="none" style={s.art}>
            <CatalogArt accessory={key === "accessories"} />
          </View>
        </Tap>
      ))}
      <View style={[s.quickRow, row]}>
        {(
          [
            { key: "saved", icon: Bookmark, label: "quickSaved" },
            { key: "recent", icon: History, label: "quickRecent" },
          ] as const
        ).map(({ key, icon: Icon, label }) => (
          <Tap key={key} onPress={() => onTab(key)} style={s.quick}>
            <View style={[s.quickTop, row]}>
              <View style={s.quickIcon}>
                <Icon size={19} color={colors.blue} strokeWidth={1.6} />
              </View>
              <Text style={s.count}>{counts?.[key] ?? "—"}</Text>
            </View>
            <Text style={[s.quickLabel, align]}>{t(label)}</Text>
          </Tap>
        ))}
      </View>
      {!!recent.sections.length && (
        <View style={s.continue}>
          <View style={[s.continueHead, row]}>
            <Text style={[s.continueTitle, align]}>
              {t("continueBrowsing")}
            </Text>
            <Tap onPress={() => onTab("recent")}>
              <Text style={s.seeAll}>{t("seeAll")}</Text>
            </Tap>
          </View>
          {recent.sections.slice(0, 2).map((item) => (
            <Tap
              key={item.id}
              onPress={() => onOpen(item)}
              style={[s.recent, row]}
            >
              <View style={s.recentDot} />
              <Text numberOfLines={1} style={[s.recentName, align]}>
                {item.name}
              </Text>
              <Arrow size={15} color="#99AEC3" />
            </Tap>
          ))}
        </View>
      )}
      <View style={s.end}>
        <View style={s.line} />
        <Text style={s.endText}>D A R E W A Z A</Text>
        <View style={s.line} />
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 25,
    width: "100%",
    maxWidth: 660,
    alignSelf: "center",
  },
  eyebrow: {
    fontFamily: font.medium,
    fontSize: 9,
    color: "#6E9F99",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontFamily: font.bold,
    fontSize: 31,
    color: colors.ink,
    lineHeight: 49,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 11,
    color: "#8B99AA",
    lineHeight: 25,
    marginTop: 8,
  },
  card: {
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E0EAF5",
    backgroundColor: "#ECF3FC",
    overflow: "hidden",
    alignItems: "center",
    minHeight: 185,
    marginBottom: 15,
  },
  accessory: { backgroundColor: "#F7F3EB", borderColor: "#EDE5D9" },
  copy: { flex: 1, padding: 21, paddingRight: 16, zIndex: 1 },
  tag: {
    fontFamily: font.medium,
    fontSize: 8,
    color: "#7294B9",
    marginBottom: 7,
  },
  cardTitle: { fontFamily: font.bold, fontSize: 24, color: colors.ink },
  cardDescription: {
    fontFamily: font.regular,
    fontSize: 10,
    color: "#8998AA",
    lineHeight: 23,
    marginTop: 2,
  },
  cta: { alignItems: "center", gap: 8, marginTop: 16 },
  ctaText: { fontFamily: font.medium, fontSize: 10, color: colors.blue },
  art: { width: "39%", alignItems: "center", justifyContent: "center" },
  quickRow: { gap: 13, marginTop: 6 },
  quick: {
    flex: 1,
    padding: 17,
    borderRadius: 21,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickTop: { alignItems: "center", justifyContent: "space-between" },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F0F5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  count: { fontWeight: "600", fontSize: 22, color: colors.navy },
  quickLabel: {
    fontFamily: font.medium,
    fontSize: 11,
    color: "#8293A7",
    marginTop: 11,
  },
  continue: { marginTop: 27 },
  continueHead: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  continueTitle: {
    fontFamily: font.bold,
    fontSize: 12,
    color: colors.ink,
    flex: 1,
  },
  seeAll: {
    fontFamily: font.regular,
    fontSize: 10,
    color: colors.blue,
    paddingVertical: 8,
  },
  recent: {
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#E9EEF3",
    paddingVertical: 13,
  },
  recentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8BC8B8",
  },
  recentName: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 12,
    color: "#627C98",
  },
  end: { flexDirection: "row", alignItems: "center", gap: 15, marginTop: 34 },
  line: { height: 1, backgroundColor: "#E4EAF1", flex: 1 },
  endText: { fontSize: 8, color: "#A4B2C1" },
});
