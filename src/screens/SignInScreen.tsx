import { useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  LockKeyhole,
} from "../components/icons";
import Svg, { Path } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand } from "../components/Brand";
import { FadeIn, Tap } from "../components/Motion";
import { LegalSheet } from "../components/LegalSheet";
import { useAuth } from "../providers/AuthProvider";
import { languages, useLanguage } from "../i18n";
import { colors, font } from "../theme";
import type { LegalKind } from "../../shared/legal";
function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M44 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11.2c-.5 2.5-2 4.6-4.2 6v5.1h6.8C41.8 35.7 44 30.6 44 24.5Z"
      />
      <Path
        fill="#34A853"
        d="M24 45c5.6 0 10.3-1.9 13.8-5l-6.8-5.2c-1.9 1.3-4.2 2-7 2-5.4 0-10-3.7-11.7-8.6h-7v5.3A21 21 0 0 0 24 45Z"
      />
      <Path
        fill="#FBBC05"
        d="M12.3 28.2a12.6 12.6 0 0 1 0-8.4v-5.3h-7a21 21 0 0 0 0 19l7-5.3Z"
      />
      <Path
        fill="#EA4335"
        d="M24 11.2c3 0 5.7 1.1 7.8 3.1l5.9-5.8A20 20 0 0 0 24 3 21 21 0 0 0 5.3 14.5l7 5.3c1.7-4.9 6.3-8.6 11.7-8.6Z"
      />
    </Svg>
  );
}
function AppleIcon() {
  return (
    <Svg width={20} height={23} viewBox="0 0 24 28">
      <Path
        fill="#162238"
        d="M17.4 4.5c1-1.2 1.7-2.8 1.5-4.5-1.5.1-3.2 1-4.3 2.2-1 1-1.8 2.7-1.6 4.3 1.7.2 3.4-.8 4.4-2ZM21.6 14.8c0-3.5 2.8-5.2 2.9-5.3-1.6-2.4-4.1-2.7-5-2.8-2.1-.2-4.2 1.3-5.3 1.3-1.1 0-2.8-1.3-4.6-1.2-2.4 0-4.6 1.4-5.8 3.5-2.5 4.2-.6 10.4 1.8 13.8 1.1 1.7 2.5 3.5 4.3 3.4 1.7-.1 2.4-1.1 4.5-1.1 2.1 0 2.7 1.1 4.5 1.1 1.9 0 3.1-1.7 4.2-3.4 1.3-1.9 1.9-3.8 1.9-3.9-.1 0-3.4-1.3-3.4-5.4Z"
        transform="translate(-2 0)"
      />
    </Svg>
  );
}
export function SignInScreen() {
  const { t, locale, setLocale, align, row } = useLanguage();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [legal, setLegal] = useState<LegalKind | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const guard = useRef(false);
  async function submit() {
    if (guard.current) return;
    if (!email.trim() || !password) {
      setError(t("requiredFields"));
      return;
    }
    guard.current = true;
    setBusy("email");
    setError("");
    auth.clearError();
    try {
      await auth.signIn(email, password);
    } catch (e) {
      setError(
        t(
          /invalid|credentials/i.test((e as Error).message)
            ? "loginError"
            : "networkError",
        ),
      );
    } finally {
      guard.current = false;
      setBusy("");
    }
  }
  async function social(provider: "google" | "apple") {
    if (guard.current) return;
    guard.current = true;
    setBusy(provider);
    setError("");
    try {
      await auth.social(provider);
    } catch {
    } finally {
      guard.current = false;
      setBusy("");
    }
  }
  return (
    <View style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <LinearGradient
            colors={["#172D57", "#244B70"]}
            style={[s.hero, { paddingTop: insets.top + 20 }]}
          >
            <View style={s.ring} />
            <View style={s.smallRing} />
            <View style={s.top}>
              <Brand light />
              <View style={s.lang}>
                {languages.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setLocale(item.key)}
                    accessibilityLabel={item.name}
                    accessibilityRole="button"
                    style={[s.langButton, locale === item.key && s.langActive]}
                  >
                    <Text
                      style={[
                        s.langText,
                        locale === item.key && { color: "#fff" },
                      ]}
                    >
                      {item.short}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FadeIn style={s.heroCopy}>
              <View style={s.pill}>
                <View style={s.mintDot} />
                <Text style={s.pillText}>{t("forYourCar")}</Text>
              </View>
              <Text style={[s.heroTitle, align]}>{t("welcome")}</Text>
              <Text style={[s.heroSubtitle, align]}>{t("signInSubtitle")}</Text>
            </FadeIn>
            <View style={s.heroBottom} />
          </LinearGradient>
          <FadeIn style={s.form}>
            <Text style={[s.formTitle, align]}>{t("signIn")}</Text>
            <View style={[s.inputWrap, row]}>
              <Mail color="#92A2B5" size={19} />
              <TextInput
                accessibilityLabel={t("email")}
                placeholder={t("email")}
                placeholderTextColor="#93A1B2"
                value={email}
                onChangeText={setEmail}
                style={s.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!busy}
              />
            </View>
            <View style={[s.inputWrap, row]}>
              <LockKeyhole color="#92A2B5" size={19} />
              <TextInput
                ref={passwordRef}
                accessibilityLabel={t("password")}
                placeholder={t("password")}
                placeholderTextColor="#93A1B2"
                value={password}
                onChangeText={setPassword}
                style={s.input}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                editable={!busy}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(show ? "hidePassword" : "showPassword")}
                onPress={() => setShow(!show)}
                style={s.eye}
              >
                {show ? (
                  <EyeOff size={19} color="#92A2B5" />
                ) : (
                  <Eye size={19} color="#92A2B5" />
                )}
              </Pressable>
            </View>
            {!!(error || auth.error) && (
              <Text accessibilityLiveRegion="polite" style={s.error}>
                {error || t(auth.error as "networkError")}
              </Text>
            )}
            <Tap
              onPress={() => void submit()}
              disabled={!!busy}
              style={s.submit}
            >
              {busy === "email" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.submitText}>{t("signIn")}</Text>
                  <ArrowRight size={20} color="#BCE4DD" />
                </>
              )}
            </Tap>
            <View style={s.divider}>
              <View style={s.line} />
              <Text style={s.or}>{t("or")}</Text>
              <View style={s.line} />
            </View>
            <Tap
              onPress={() => void social("google")}
              disabled={!!busy}
              style={s.social}
            >
              {busy === "google" ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <GoogleIcon />
              )}
              <Text style={s.socialText}>{t("google")}</Text>
            </Tap>
            {Platform.OS === "ios" ? (
              <View
                style={{ opacity: busy ? 0.5 : 1, marginTop: 10 }}
                pointerEvents={busy ? "none" : "auto"}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={16}
                  style={{ width: "100%", height: 54 }}
                  onPress={() => void social("apple")}
                />
              </View>
            ) : (
              <Tap
                onPress={() => void social("apple")}
                disabled={!!busy}
                style={[s.social, { marginTop: 10 }]}
              >
                {busy === "apple" ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <AppleIcon />
                )}
                <Text style={s.socialText}>{t("apple")}</Text>
              </Tap>
            )}
            <Text style={s.legal}>
              {t("authLegal")}
              {"\n"}
              <Text
                accessibilityRole="link"
                onPress={() => setLegal("terms")}
                style={s.link}
              >
                {t("terms")}
              </Text>{" "}
              {t("and")}{" "}
              <Text
                accessibilityRole="link"
                onPress={() => setLegal("privacy")}
                style={s.link}
              >
                {t("privacy")}
              </Text>
              .
            </Text>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
      <LegalSheet kind={legal} onClose={() => setLegal(null)} />
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F9FC" },
  hero: {
    paddingHorizontal: 26,
    paddingBottom: 38,
    overflow: "hidden",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  ring: {
    position: "absolute",
    width: 330,
    height: 330,
    borderWidth: 1,
    borderColor: "#FFFFFF0A",
    borderRadius: 170,
    right: -150,
    top: -50,
  },
  smallRing: {
    position: "absolute",
    width: 230,
    height: 230,
    borderWidth: 1,
    borderColor: "#FFFFFF08",
    borderRadius: 120,
    left: -90,
    bottom: -140,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  lang: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    backgroundColor: "#FFFFFF08",
    borderWidth: 1,
    borderColor: "#FFFFFF12",
  },
  langButton: {
    paddingHorizontal: 8,
    minHeight: 33,
    justifyContent: "center",
    borderRadius: 9,
  },
  langActive: { backgroundColor: "#FFFFFF18" },
  langText: { color: "#B7C8DD", fontSize: 10, fontWeight: "600" },
  heroCopy: {
    paddingTop: 52,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 15,
  },
  mintDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#8EDCC9" },
  pillText: {
    fontSize: 8,
    letterSpacing: 2,
    color: "#B0D2CE",
    fontWeight: "600",
  },
  heroTitle: {
    fontFamily: font.bold,
    fontSize: 26,
    lineHeight: 45,
    color: "#fff",
  },
  heroSubtitle: {
    fontFamily: font.regular,
    fontSize: 12,
    color: "#BDCEDF",
    marginTop: 8,
    lineHeight: 25,
  },
  heroBottom: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#77CBB9",
    marginTop: 25,
  },
  form: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 26,
    paddingTop: 27,
  },
  formTitle: {
    fontFamily: font.bold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 19,
  },
  inputWrap: {
    minHeight: 58,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E1E7EF",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 17,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 13,
    textAlign: "left",
    writingDirection: "ltr",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  eye: { padding: 9, marginRight: -8 },
  submit: {
    height: 56,
    backgroundColor: colors.navy,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 15,
    marginTop: 6,
  },
  submitText: { fontFamily: font.bold, fontSize: 14, color: "#fff" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 22,
  },
  line: { flex: 1, height: 1, backgroundColor: "#E5EAF0" },
  or: { fontFamily: font.regular, fontSize: 10, color: "#96A2B1" },
  social: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E7EF",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
  },
  socialText: { fontFamily: font.medium, fontSize: 12, color: colors.ink },
  legal: {
    fontFamily: font.regular,
    color: "#94A0AF",
    fontSize: 10,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 24,
  },
  link: { color: colors.blue, textDecorationLine: "underline" },
  error: {
    fontFamily: font.regular,
    fontSize: 11,
    color: "#B45D58",
    lineHeight: 23,
    marginBottom: 8,
    textAlign: "center",
  },
});
