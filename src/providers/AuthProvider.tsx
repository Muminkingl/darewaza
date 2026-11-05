import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Linking, Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, supabaseUrl, supabaseAnonKey } from "../lib/supabase";
import { deleteDeviceBookmarks } from '../lib/bookmarks';

WebBrowser.maybeCompleteAuthSession();
type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  appleEnabled: boolean;
  error: string;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  social: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};
const Context = createContext<AuthContextValue>(null!);
let lastCode = "";
let providerSettings: Promise<{ google: boolean; apple: boolean }> | undefined;
async function availableProviders() {
  return (providerSettings ??= (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: supabaseAnonKey },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("settings");
      return (await res.json()).external as { google: boolean; apple: boolean };
    } catch (e) {
      providerSettings = undefined;
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  })());
}
async function exchange(url: string) {
  const callback = new URL(url);
  if (
    callback.protocol !== "darewaza:" ||
    callback.host !== "auth" ||
    callback.pathname !== "/callback"
  )
    return;
  if (callback.searchParams.get("error")) throw new Error("oauth_failed");
  const code = callback.searchParams.get("code");
  if (!code || code === lastCode) return;
  lastCode = code;
  const { error } = await supabase!.auth.exchangeCodeForSession(code);
  if (error) {
    lastCode = "";
    throw error;
  }
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [appleEnabled, setAppleEnabled] = useState(false);
  const [error, setError] = useState("");
  const socialBusy = useRef(false);
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let live = true;
    void availableProviders()
      .then((providers) => {
        if (live) setAppleEnabled(providers.apple === true);
      })
      .catch(() => {});
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (live) {
        setSession(next);
        setReady(true);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (live) {
          setSession(data.session);
          if (error) setError("networkError");
          setReady(true);
        }
      })
      .catch(() => {
        if (live) {
          setError("networkError");
          setReady(true);
        }
      });
    const listener = Linking.addEventListener("url", ({ url }) => {
      void exchange(url).catch(() => setError("networkError"));
    });
    if (Platform.OS !== "web")
      void Linking.getInitialURL()
        .then((url) => {
          if (url) return exchange(url);
        })
        .catch(() => setError("networkError"));
    return () => {
      live = false;
      subscription.unsubscribe();
      listener.remove();
    };
  }, []);
  async function social(provider: "google" | "apple") {
    if (!supabase || socialBusy.current) return;
    socialBusy.current = true;
    setError("");
    try {
      if (!(await availableProviders())[provider])
        throw new Error("providerUnavailable");
      if (provider === "apple" && Platform.OS === "ios") {
        const nonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          nonce,
        );
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });
        if (!credential.identityToken) throw new Error("providerUnavailable");
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
          nonce,
        });
        if (error) throw error;
        const name = [
          credential.fullName?.givenName,
          credential.fullName?.familyName,
        ]
          .filter(Boolean)
          .join(" ");
        if (name) await supabase.auth.updateUser({ data: { full_name: name } });
      } else {
        const redirectTo =
          Platform.OS === "web"
            ? `${window.location.origin}${window.location.pathname.startsWith("/app") ? "/app/" : "/"}`
            : AuthSession.makeRedirectUri({
                scheme: "darewaza",
                path: "auth/callback",
              });
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            ...(provider === "google"
              ? { queryParams: { prompt: "select_account" } }
              : {}),
          },
        });
        if (error) throw error;
        if (!data.url) throw new Error("providerUnavailable");
        if (Platform.OS === "web") {
          if (
            new URLSearchParams(window.location.search).get("action") ===
            "delete-account"
          )
            window.sessionStorage.setItem("darewaza.deleteRequested", "1");
          window.location.assign(data.url);
          return;
        }
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
        );
        if (result.type === "success") await exchange(result.url);
      }
    } catch (e) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return;
      setError(
        (e as Error).message === "providerUnavailable" ||
          /provider|not enabled/i.test((e as Error).message)
          ? "providerUnavailable"
          : "networkError",
      );
      throw e;
    } finally {
      socialBusy.current = false;
    }
  }
  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setSession(null);
  }
  async function deleteAccount() {
    if (!session || !supabase) throw new Error("not_authenticated");
    let authorizationCode: string | undefined;
    const apple = session.user.identities?.some(
      (identity) => identity.provider === "apple",
    );
    if (apple && Platform.OS === "ios") {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [],
      });
      if (
        credential.user !==
        session.user.identities?.find((i) => i.provider === "apple")
          ?.identity_data?.sub
      )
        throw new Error("appleReauth");
      authorizationCode = credential.authorizationCode || undefined;
    }
    // getSession refreshes an expiring access token before this sensitive request.
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    if (!current) throw new Error("not_authenticated");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://darewaza.vercel.app"}/api/account`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${current.access_token}`,
          },
          body: JSON.stringify({
            confirm: true,
            authorization_code: authorizationCode,
            provider_refresh_token: apple
              ? current.provider_refresh_token
              : undefined,
            apple_platform: Platform.OS === "ios" ? "native" : "web",
          }),
          signal: controller.signal,
        },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          payload.code === "apple_reauth" ? "appleReauth" : "deleteFailed",
        );
      }
      await AsyncStorage.multiRemove([
        "darewaza.location.v1",
        "sayara.location.v1",
      ]).catch(() => {});
      await deleteDeviceBookmarks(current.user.id);
      await supabase.auth.signOut({ scope: "local" });
      setSession(null);
    } finally {
      clearTimeout(timeout);
    }
  }
  return (
    <Context.Provider
      value={{
        session,
        ready,
        appleEnabled,
        error,
        clearError: () => setError(""),
        signIn: async (email, password) => {
          if (!supabase) throw new Error("not_configured");
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) throw error;
        },
        social,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
