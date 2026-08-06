import { createClient } from "@supabase/supabase-js";

type BrowserClient = ReturnType<typeof createClient>;

let browserClient: BrowserClient | undefined;

const REMEMBER_ME_KEY = "strafe-crate-remember-me";
const AUTH_STORAGE_KEY = "strafe-crate-auth";

function readRememberMePreference() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(REMEMBER_ME_KEY) !== "false";
}

export function setRememberMePreference(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_ME_KEY, String(remember));
}

export function getRememberMePreference() {
  return readRememberMePreference();
}

/**
 * One storage adapter is shared by the entire site.
 *
 * It checks both storage locations when reading so the header, AuthGuard,
 * dashboard, and Checkout all see the same session. New session writes follow
 * the current Remember Me preference and remove stale copies.
 */
const browserAuthStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") return null;

    return (
      window.localStorage.getItem(key) ??
      window.sessionStorage.getItem(key)
    );
  },

  setItem(key: string, value: string) {
    if (typeof window === "undefined") return;

    if (readRememberMePreference()) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },

  removeItem(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function getSupabase() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: browserAuthStorage,
      storageKey: AUTH_STORAGE_KEY,
    },
  });

  return browserClient;
}
