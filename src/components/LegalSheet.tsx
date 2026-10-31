import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X } from "./icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { legalContent, type LegalKind } from "../../shared/legal";
import { useLanguage } from "../i18n";
import { colors, font } from "../theme";
export function LegalSheet({
  kind,
  onClose,
}: {
  kind: LegalKind | null;
  onClose: () => void;
}) {
  const { locale, t, align, row } = useLanguage();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!kind} animationType="slide" onRequestClose={onClose}>
      <View style={[s.page, { paddingTop: insets.top }]}>
        <View style={[s.header, row]}>
          <Text style={[s.label, align]}>
            {t(kind === "privacy" ? "privacy" : "terms")}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            style={s.close}
          >
            <X size={22} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          <Text style={[s.title, align]}>
            {t(kind === "privacy" ? "privacyTitle" : "termsTitle")}
          </Text>
          <Text style={[s.date, align]}>{t("updated")}</Text>
          {kind &&
            legalContent[locale][kind].map((p, i) => (
              <View key={i} style={s.paragraph}>
                <Text style={[s.heading, align]}>{p.title}</Text>
                <Text selectable style={[s.body, align]}>
                  {p.body}
                </Text>
              </View>
            ))}
          <Text selectable style={s.email}>
            contact@trxstudio.xyz
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: 20,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  content: { padding: 26, maxWidth: 700, width: "100%", alignSelf: "center" },
  title: { fontFamily: font.bold, fontSize: 27, color: colors.ink },
  date: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.muted,
    marginVertical: 12,
  },
  paragraph: { marginTop: 22 },
  heading: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  body: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 29,
    color: "#627289",
    marginTop: 7,
  },
  email: {
    textAlign: "center",
    fontSize: 13,
    color: colors.blue,
    marginTop: 30,
  },
});
