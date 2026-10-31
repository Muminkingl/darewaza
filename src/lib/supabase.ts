import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { publicConfig } from "./publicConfig";

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || publicConfig.url;
export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || publicConfig.anonKey;
const key = supabaseAnonKey;

// Split long sessions for devices with small Keychain item limits. Secrets never enter AsyncStorage on native.
const secureStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    if (!Number.isInteger(count) || count < 1 || count > 50) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${i}`),
      ),
    );
    return parts.some((v) => v === null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    const old = Number(await SecureStore.getItemAsync(`${key}.count`)) || 0;
    const parts = value.match(/[\s\S]{1,1500}/g) || [""];
    for (let i = 0; i < parts.length; i++)
      await SecureStore.setItemAsync(`${key}.${i}`, parts[i], {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    await SecureStore.setItemAsync(`${key}.count`, String(parts.length));
    for (let i = parts.length; i < old; i++)
      await SecureStore.deleteItemAsync(`${key}.${i}`);
  },
  async removeItem(key: string) {
    const count = Math.min(
      Number(await SecureStore.getItemAsync(`${key}.count`)) || 0,
      50,
    );
    await SecureStore.deleteItemAsync(`${key}.count`);
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(`${key}.${i}`),
      ),
    );
  },
};

// No service role, database password or bot token belongs in the customer app.
export const supabase =
  supabaseUrl && key
    ? createClient(supabaseUrl, key, {
        auth: {
          storage: Platform.OS === "web" ? AsyncStorage : secureStorage,
          storageKey: "darewaza.auth",
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: Platform.OS === "web",
          ...(Platform.OS !== "web" ? { lock: processLock } : {}),
        },
        global: {
          fetch: async (input, init) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const abort = () => controller.abort();
            init?.signal?.addEventListener("abort", abort, { once: true });
            if (init?.signal?.aborted) controller.abort();
            try {
              return await fetch(input, { ...init, signal: controller.signal });
            } finally {
              clearTimeout(timeout);
              init?.signal?.removeEventListener("abort", abort);
            }
          },
        },
      })
    : null;

if (Platform.OS !== "web" && supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
