import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Globe2,
  Info,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "../components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../providers/AuthProvider";
import { useCounts, useCustomer } from "../providers/CustomerProvider";
import { languages, useLanguage } from "../i18n";
import { Tap } from "../components/Motion";
import { BrandMark } from "../components/Brand";
import { LegalSheet } from "../components/LegalSheet";
import { colors, font } from "../theme";
import type { LegalKind } from "../../shared/legal";
type Sheet = "edit" | "signout" | "delete" | "about" | null;
function SettingRow({
  icon: Icon,
  label,
  onPress,
  danger = false,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  onPress: () => void;
  danger?: boolean;
  value?: string;
}) {
  const { row, align, rtl } = useLanguage();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <Tap style={[s.settingRow, row]} onPress={onPress}>
      <View style={[s.settingIcon, danger && { backgroundColor: "#FBEEEC" }]}>
        <Icon
          size={20}
          color={danger ? "#B66D66" : "#6E8EAC"}
          strokeWidth={1.6}
        />
      </View>
      <Text style={[s.settingLabel, align, danger && { color: "#B66D66" }]}>
        {label}
      </Text>
      {value && (
        <Text numberOfLines={1} style={s.settingValue}>
          {value}
        </Text>
      )}
      <Arrow size={16} color={danger ? "#CF9B95" : "#ADBBCA"} />
    </Tap>
  );
}
function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { align } = useLanguage();
  return (
    <View style={s.group}>
      <Text style={[s.groupTitle, align]}>{title}</Text>
      <View style={s.settings}>{children}</View>
    </View>
  );
}
export function ProfileScreen({
  city,
  onLocation,
  onSaved,
  deleteRequested = false,
}: {
  city: string;
  onLocation: () => void;
  onSaved: () => void;
  deleteRequested?: boolean;
}) {
  const { t, locale, row, align } = useLanguage();
  const auth = useAuth();
  const customer = useCustomer();
  const { data: counts } = useCounts();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<Sheet>(deleteRequested ? "delete" : null);
  const [legal, setLegal] = useState<LegalKind | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const guard = useRef(false);
  const displayName =
    customer.profile?.display_name ||
    auth.session!.user.user_metadata?.full_name ||
    auth.session!.user.email?.split("@")[0] ||
    "Darewaza";
  useEffect(() => {
    if (deleteRequested) setSheet("delete");
  }, [deleteRequested]);
  function open(next: Sheet) {
    setMessage("");
    setName(displayName);
    setSheet(next);
  }
  async function action() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (sheet === "edit") await customer.saveProfile(name);
      if (sheet === "signout") await auth.signOut();
      if (sheet === "delete") await auth.deleteAccount();
      setSheet(null);
    } catch (e) {
      setMessage(
        t(
          sheet === "delete"
            ? (e as Error).message === "appleReauth"
              ? "appleReauth"
              : "deleteFailed"
            : "networkError",
        ),
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  const Row = SettingRow,
    Group = SettingsGroup;
  return (
    <>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.intro, row]}>
          <Text style={[s.pageTitle, align]}>{t("profile")}</Text>
        </View>
        <View style={s.profileCard}>
          <View style={[s.identity, row]}>
            <View style={s.avatar}>
              <Text style={s.initial}>
                {displayName.trim().slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[s.name, align]}>
                {displayName}
              </Text>
              <Text numberOfLines={1} style={[s.email, align]}>
                {auth.session!.user.email}
              </Text>
            </View>
            <Tap
              onPress={() => open("edit")}
              accessibilityLabel={t("editProfile")}
              style={s.edit}
            >
              <Pencil size={17} color={colors.blue} />
            </Tap>
          </View>
          <View style={[s.stats, row]}>
            <Tap onPress={onSaved} style={[s.stat, row]}>
              <Bookmark size={20} color="#8DA5BC" strokeWidth={1.5} />
              <Text style={[s.statLabel, align, { flex: 1 }]}>
                {t("saved")}
              </Text>
              <Text style={s.statValue}>{counts?.saved ?? "—"}</Text>
            </Tap>
          </View>
        </View>
        <Group title={t("preferences")}>
          <View style={s.languageSetting}>
            <View style={[s.languageHeading, row]}>
              <View style={s.settingIcon}>
                <Globe2 size={20} color="#6E8EAC" strokeWidth={1.6} />
              </View>
              <Text style={[s.settingLabel, align]}>{t("language")}</Text>
            </View>
            <View style={[s.languages, row]}>
              {languages.map((item) => (
                <Tap
                  key={item.key}
                  onPress={() => {
                    setMessage("");
                    void customer
                      .changeLanguage(item.key)
                      .catch(() => setMessage(t("syncError")));
                  }}
                  accessibilityState={{ selected: locale === item.key }}
                  style={[
                    s.language,
                    locale === item.key && s.languageSelected,
                  ]}
                >
                  <Text
                    style={[
                      s.languageText,
                      locale === item.key && { color: colors.blue },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {locale === item.key && <View style={s.selectedDot} />}
                </Tap>
              ))}
            </View>
          </View>
          <Row
            icon={MapPin}
            label={t("location")}
            value={city}
            onPress={onLocation}
          />
        </Group>
        <Group title={t("support")}>
          <Row
            icon={ShieldCheck}
            label={t("privacy")}
            onPress={() => setLegal("privacy")}
          />
          <Row
            icon={Info}
            label={t("terms")}
            onPress={() => setLegal("terms")}
          />
          <Row
            icon={Mail}
            label={t("contact")}
            onPress={() => {
              void Linking.openURL("mailto:contact@trxstudio.xyz").catch(() =>
                setMessage("contact@trxstudio.xyz"),
              );
            }}
          />
          <Row icon={Info} label={t("about")} onPress={() => open("about")} />
        </Group>
        <Group title={t("manageAccount")}>
          <Row
            icon={LogOut}
            label={t("signOut")}
            onPress={() => open("signout")}
          />
          <Row
            icon={Trash2}
            label={t("deleteAccount")}
            danger
            onPress={() => open("delete")}
          />
        </Group>
        {!!message && !sheet && (
          <Text accessibilityLiveRegion="polite" style={s.message}>
            {message}
          </Text>
        )}
        <View style={s.footer}>
          <BrandMark size={25} />
          <Text style={s.footerName}>Darewaza.</Text>
          <Text style={s.version}>{t("version")} · TRX Studio</Text>
        </View>
      </ScrollView>
      <Modal
        visible={!!sheet}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setSheet(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.overlay}
        >
          <Pressable
            accessibilityLabel={t("close")}
            disabled={busy}
            style={StyleSheet.absoluteFill}
            onPress={() => setSheet(null)}
          />
          <View
            style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 22) }]}
            accessibilityViewIsModal
          >
            <View style={s.handle} />
            <Pressable
              disabled={busy}
              onPress={() => setSheet(null)}
              style={s.close}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <X size={21} color={colors.muted} />
            </Pressable>
            <View
              style={[
                s.sheetIcon,
                sheet === "delete" && { backgroundColor: "#FAEEEC" },
              ]}
            >
              {sheet === "delete" ? (
                <Trash2 size={26} color="#B86E65" />
              ) : (
                <BrandMark size={32} />
              )}
            </View>
            <Text style={s.sheetTitle}>
              {t(
                sheet === "delete"
                  ? "deleteTitle"
                  : sheet === "edit"
                    ? "editProfile"
                    : sheet === "about"
                      ? "about"
                      : "signOut",
              )}
            </Text>
            {sheet === "edit" ? (
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={80}
                editable={!busy}
                autoFocus
                accessibilityLabel={t("displayName")}
                placeholder={t("displayName")}
                style={[s.nameInput, align]}
              />
            ) : (
              <Text style={s.sheetBody}>
                {t(
                  sheet === "delete"
                    ? "deleteBody"
                    : sheet === "about"
                      ? "aboutBody"
                      : "signOutBody",
                )}
              </Text>
            )}
            {!!message && (
              <Text accessibilityLiveRegion="polite" style={s.message}>
                {message}
              </Text>
            )}
            {sheet === "about" ? (
              <Tap onPress={() => setSheet(null)} style={s.primary}>
                <Text style={s.primaryText}>{t("done")}</Text>
              </Tap>
            ) : (
              <>
                <Tap
                  onPress={() => void action()}
                  disabled={busy}
                  style={[
                    s.primary,
                    sheet === "delete" && { backgroundColor: "#AF6259" },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryText}>
                      {t(
                        sheet === "delete"
                          ? "deleteConfirm"
                          : sheet === "edit"
                            ? "saveChanges"
                            : "confirm",
                      )}
                    </Text>
                  )}
                </Tap>
                <Tap
                  onPress={() => setSheet(null)}
                  disabled={busy}
                  style={s.cancel}
                >
                  <Text style={s.cancelText}>{t("cancel")}</Text>
                </Tap>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <LegalSheet kind={legal} onClose={() => setLegal(null)} />
    </>
  );
}
const s = StyleSheet.create({
  content: {
    padding: 23,
    paddingBottom: 30,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  intro: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 22,
  },
  pageTitle: { fontFamily: font.bold, fontSize: 26, color: colors.ink },
  profileCard: {
    borderWidth: 1,
    borderColor: "#E3EAF2",
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
  },
  identity: { alignItems: "center", gap: 15 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 21,
    backgroundColor: "#E7F1EF",
    justifyContent: "center",
    alignItems: "center",
  },
  initial: { fontFamily: font.bold, fontSize: 25, color: "#608F84" },
  name: { fontFamily: font.bold, fontSize: 18, color: colors.ink },
  email: { fontSize: 11, color: "#9AABBD", marginTop: 7 },
  edit: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: "#F1F5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  stats: {
    gap: 12,
    marginTop: 25,
    paddingTop: 18,
    borderTopWidth: 1,
    borderColor: "#EEF2F6",
  },
  stat: {
    flex: 1,
    backgroundColor: "#F6F8FB",
    borderRadius: 15,
    padding: 14,
    alignItems: "center",
    gap: 12,
  },
  statValue: { fontSize: 24, fontWeight: "600", color: colors.navy },
  statLabel: {
    fontFamily: font.regular,
    fontSize: 10,
    color: "#8A9DB1",
  },
  group: { marginTop: 25 },
  groupTitle: {
    fontFamily: font.medium,
    fontSize: 9,
    color: "#8F9FB1",
    marginHorizontal: 4,
    marginBottom: 11,
    letterSpacing: 0.6,
  },
  settings: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  settingRow: {
    paddingHorizontal: 15,
    minHeight: 65,
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F4F7",
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F0F5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 12,
    color: "#4C6581",
  },
  settingValue: {
    fontFamily: font.regular,
    fontSize: 10,
    color: "#8FA0B3",
    maxWidth: 105,
  },
  languageSetting: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#F1F4F7",
  },
  languageHeading: { alignItems: "center", gap: 12 },
  languages: { gap: 8, marginTop: 13 },
  language: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 43,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#E8EDF3",
    borderRadius: 12,
    gap: 4,
    flexDirection: "row",
  },
  languageSelected: { backgroundColor: "#EDF4FB", borderColor: "#D5E3F2" },
  languageText: { fontFamily: font.medium, fontSize: 11, color: "#91A1B4" },
  selectedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6D9DBD",
  },
  footer: { alignItems: "center", marginTop: 32, gap: 7 },
  footerName: {
    fontWeight: "700",
    fontSize: 15,
    color: "#9CAEBF",
    letterSpacing: -0.4,
  },
  version: {
    fontFamily: font.regular,
    fontSize: 8,
    color: "#ABB8C7",
    marginTop: 3,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#10213B66",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 520,
    padding: 26,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E1E7EE",
    alignSelf: "center",
    marginTop: -12,
    marginBottom: 20,
  },
  close: { position: "absolute", top: 23, left: 20, padding: 10 },
  sheetIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "#F0F5FA",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 5,
  },
  sheetTitle: {
    fontFamily: font.bold,
    fontSize: 22,
    color: colors.ink,
    textAlign: "center",
    marginTop: 18,
  },
  sheetBody: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 28,
    color: "#8A9AAE",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  primary: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.navy,
    marginTop: 15,
  },
  primaryText: { fontFamily: font.bold, fontSize: 13, color: "#fff" },
  cancel: { padding: 16, alignItems: "center" },
  cancelText: { fontFamily: font.medium, fontSize: 12, color: "#91A0B3" },
  nameInput: {
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.ink,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E1E8F0",
    backgroundColor: "#F7F9FC",
    padding: 15,
    marginTop: 22,
  },
  message: {
    fontFamily: font.regular,
    fontSize: 11,
    lineHeight: 24,
    color: "#B1675D",
    textAlign: "center",
    marginTop: 10,
  },
});
