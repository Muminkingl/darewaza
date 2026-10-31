import { StyleSheet, Text, View } from "react-native";
import {
  useCollection,
  type CollectionKind,
} from "../providers/CustomerProvider";
import { SectionList } from "../components/SectionList";
import { useLanguage } from "../i18n";
import { colors, font } from "../theme";
import type { Section } from "../../shared/catalog";
export function CollectionScreen({
  kind,
  onOpen,
}: {
  kind: CollectionKind;
  onOpen: (section: Section) => void;
}) {
  const { t, align } = useLanguage();
  const data = useCollection(kind);
  return (
    <SectionList
      data={data}
      knownSaved={kind === "saved"}
      onOpen={onOpen}
      emptyTitle={t(kind === "saved" ? "savedEmpty" : "recentEmpty")}
      emptyHint={t(kind === "saved" ? "savedEmptyHint" : "recentEmptyHint")}
      header={
        <View style={s.header}>
          <Text style={[s.title, align]}>
            {t(kind === "saved" ? "savedTitle" : "recentTitle")}
          </Text>
          <Text style={[s.subtitle, align]}>
            {t(kind === "saved" ? "savedSubtitle" : "recentSubtitle")}
          </Text>
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
