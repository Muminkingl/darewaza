import { StyleSheet, Text, View } from "react-native";
import { useSavedSections } from "../providers/CustomerProvider";
import { SectionList } from "../components/SectionList";
import { useLanguage } from "../i18n";
import { colors, font } from "../theme";
import type { Section } from "../../shared/catalog";
export function CollectionScreen({
  onOpen,
}: {
  onOpen: (section: Section) => void;
}) {
  const { t, align } = useLanguage();
  const data = useSavedSections();
  return (
    <SectionList
      data={data}
      onOpen={onOpen}
      emptyTitle={t("savedEmpty")}
      emptyHint={t("savedEmptyHint")}
      header={
        <View style={s.header}>
          <Text style={[s.title, align]}>{t("savedTitle")}</Text>
          <Text style={[s.subtitle, align]}>{t("savedSubtitle")}</Text>
        </View>
      }
    />
  );
}
const s = StyleSheet.create({
  header: { paddingTop: 27, paddingBottom: 26 },
  title: { fontFamily: font.bold, fontSize: 25, color: colors.ink },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 26,
    marginTop: 7,
  },
});
