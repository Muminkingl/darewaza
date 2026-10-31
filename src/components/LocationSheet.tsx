import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, LocateFixed, MapPin, X } from "./icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../i18n";
import { cities, cityLabel } from "../lib/cities";
import { useReducedMotion } from "./Motion";
import { colors, font } from "../theme";
interface Props {
  visible: boolean;
  city: string;
  detecting: boolean;
  message: string;
  onClose: () => void;
  onDetect: () => void;
  onSelect: (city: string) => void;
}
export function LocationSheet(props: Props) {
  const { t, locale, row, align } = useLanguage();
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const options = cities.filter((c) =>
    c.some((n) => n.toLowerCase().includes(query.trim().toLowerCase())),
  );
  return (
    <Modal
      visible={props.visible}
      animationType={reduce ? "none" : "slide"}
      transparent
      onRequestClose={props.onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={props.onClose}
          accessibilityLabel={t("close")}
        />
        <View
          style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
          accessibilityViewIsModal
        >
          <View style={s.handle} />
          <Pressable
            onPress={props.onClose}
            style={s.close}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
          >
            <X color={colors.muted} size={22} />
          </Pressable>
          <View style={s.pin}>
            <MapPin color="#639B92" size={27} />
          </View>
          <Text style={s.title}>{t("locateTitle")}</Text>
          <Text style={s.subtitle}>{t("locateSubtitle")}</Text>
          <Pressable
            onPress={props.onDetect}
            disabled={props.detecting}
            style={[s.detect, row]}
            accessibilityRole="button"
          >
            {props.detecting ? (
              <ActivityIndicator color="white" />
            ) : (
              <LocateFixed color="white" size={20} />
            )}
            <Text style={s.detectText}>
              {t(props.detecting ? "detecting" : "detect")}
            </Text>
          </Pressable>
          {!!props.message && (
            <Text accessibilityLiveRegion="polite" style={[s.message, align]}>
              {props.message}
            </Text>
          )}
          <View style={s.divider}>
            <View style={s.line} />
            <Text style={s.or}>{t("manual")}</Text>
            <View style={s.line} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("cityPlaceholder")}
            placeholderTextColor={colors.muted}
            style={[s.input, align]}
            maxLength={80}
            accessibilityLabel={t("cityPlaceholder")}
          />
          <ScrollView
            style={{ maxHeight: 210 }}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((c) => (
              <Pressable
                key={c[0]}
                style={[s.city, row]}
                onPress={() => {
                  props.onSelect(c[0]);
                  setQuery("");
                }}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    s.cityText,
                    align,
                    props.city === cityLabel(c[0], locale) && {
                      color: colors.cyan,
                    },
                  ]}
                >
                  {cityLabel(c[0], locale)}
                </Text>
                {props.city === cityLabel(c[0], locale) && (
                  <Check color={colors.cyan} size={19} />
                )}
              </Pressable>
            ))}
            {!!query.trim() &&
              !cities.some((c) => c.includes(query.trim())) && (
                <Pressable
                  style={[s.city, row]}
                  onPress={() => {
                    props.onSelect(query);
                    setQuery("");
                  }}
                  accessibilityRole="button"
                >
                  <Text style={[s.cityText, align]}>
                    {t("select")} «{query.trim()}»
                  </Text>
                  <Check color={colors.cyan} size={19} />
                </Pressable>
              )}
          </ScrollView>
          <Pressable
            onPress={props.onClose}
            style={s.later}
            accessibilityRole="button"
          >
            <Text style={s.laterText}>{t("later")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0C1C3966",
    justifyContent: "flex-end",
    alignItems: "center",
    direction: "ltr",
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    padding: 24,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#E2E7ED",
    borderRadius: 4,
    alignSelf: "center",
    marginTop: -10,
    marginBottom: 20,
  },
  close: { position: "absolute", top: 28, left: 24, padding: 8 },
  pin: {
    alignSelf: "center",
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#EDF6F2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: font.bold,
    fontSize: 24,
    textAlign: "center",
    color: colors.ink,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 12,
    textAlign: "center",
    color: colors.muted,
    lineHeight: 25,
    marginTop: 4,
    marginBottom: 20,
  },
  detect: {
    backgroundColor: colors.navy,
    borderRadius: 15,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  detectText: { color: "#fff", fontFamily: font.medium, fontSize: 13 },
  message: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 25,
    color: "#699A90",
    paddingTop: 12,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  line: { height: 1, backgroundColor: colors.line, flex: 1 },
  or: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  input: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  city: {
    minHeight: 49,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F5F8",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cityText: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.ink,
    flexShrink: 1,
  },
  later: { alignItems: "center", paddingTop: 18 },
  laterText: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
});
