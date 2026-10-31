import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { NotoSansArabic_400Regular } from "@expo-google-fonts/noto-sans-arabic/400Regular";
import { NotoSansArabic_500Medium } from "@expo-google-fonts/noto-sans-arabic/500Medium";
import { NotoSansArabic_700Bold } from "@expo-google-fonts/noto-sans-arabic/700Bold";
import { LanguageProvider, useLanguage } from "./src/i18n";
import { AuthProvider, useAuth } from "./src/providers/AuthProvider";
import { CustomerProvider } from "./src/providers/CustomerProvider";
import { InitialLoader } from "./src/components/InitialLoader";
import { SignInScreen } from "./src/screens/SignInScreen";
import { AppShell } from "./src/AppShell";
import { MotionProvider } from "./src/components/Motion";

void SplashScreen.preventAutoHideAsync().catch(() => {});
function Gate() {
  const { session, ready } = useAuth();
  const language = useLanguage();
  const [fonts, fontError] = useFonts({
    NotoSansArabic_400Regular,
    NotoSansArabic_500Medium,
    NotoSansArabic_700Bold,
  });
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);
  if (!ready || !language.ready || (!fonts && !fontError))
    return <InitialLoader />;
  return session ? (
    <CustomerProvider key={session.user.id}>
      <AppShell />
    </CustomerProvider>
  ) : (
    <SignInScreen />
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <MotionProvider>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Gate />
          </AuthProvider>
        </LanguageProvider>
      </MotionProvider>
    </SafeAreaProvider>
  );
}
