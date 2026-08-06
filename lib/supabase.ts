import { createClient } from "@supabase/supabase-js";

type BrowserClient = ReturnType<typeof createClient>;

let browserClient: BrowserClient | undefined;
let browserClientPersistence: boolean | undefined;

const REMEMBER_ME_KEY = "strafe-crate-remember-me";

function readRememberMePreference() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(REMEMBER_ME_KEY) !== "false";
}

export function setRememberMePreference(remember: boolean) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(REMEMBER_ME_KEY, String(remember));

  // Recreate the browser client if the requested storage mode changed.
  // This runs before sign-in, so the new session is written to the correct store.
  if (browserClientPersistence !== remember) {
    browserClient = undefined;
    browserClientPersistence = undefined;
  }
}

export function getRememberMePreference() {
  return readRememberMePreference();
}

export function getSupabase() {
  const remember = readRememberMePreference();

  if (browserClient && browserClientPersistence === remember) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  const storage =
    typeof window === "undefined"
      ? undefined
      : remember
        ? window.localStorage
        : window.sessionStorage;

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage,
      storageKey: remember
        ? "strafe-crate-auth"
        : "strafe-crate-auth-session",
    },
  });

  browserClientPersistence = remember;
  return browserClient;
}
