// services/googleAuth.ts
// Replaces services/supabase.ts's auth half. Uses native Google Sign-In
// (Credential Manager / legacy Play Services SDK under the hood) rather
// than a hand-rolled expo-auth-session browser flow — Google's own guidance
// and Expo's docs both point here, partly because browser-based OAuth on
// Android has a well-documented ~30% redirect-failure rate. This library
// also manages token refresh internally, so nothing here hand-manages
// refresh tokens the way a raw OAuth client credential flow would.
//
// Scope: full https://www.googleapis.com/auth/drive access, not the
// narrower drive.file scope. drive.file would only let the app see files
// *it* created, which breaks the "employee's phone opens a folder the
// owner shared with them" use case unless we also integrate the Google
// Picker (a web-only API, awkward from React Native). Full `drive` access
// keeps setup to "share the folder, sign in" with no extra picker step —
// the tradeoff is that this scope requires an OAuth consent screen you
// either keep in Testing mode (fine for two named users, but re-auth may
// be required periodically) or submit for Google's verification if you
// want that to go away. See the setup README for the exact tradeoff.

import { GoogleSignin } from "@react-native-google-signin/google-signin";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const hasGoogleAuth = !!WEB_CLIENT_ID;

let configured = false;
function ensureConfigured() {
  if (configured || !WEB_CLIENT_ID) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    scopes: [DRIVE_SCOPE, "email", "profile"],
  });
  configured = true;
}

export interface GoogleUser {
  id: string;
  name: string | null;
  email: string;
}

function toGoogleUser(data: {
  user: { id: string; name: string | null; email: string };
}): GoogleUser {
  return { id: data.user.id, name: data.user.name, email: data.user.email };
}

/** Interactive sign-in — shows the account picker / consent screen. */
export async function signInWithGoogle(): Promise<GoogleUser | null> {
  if (!hasGoogleAuth) return null;
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type !== "success") return null;
  return toGoogleUser(result.data);
}

/** Silent re-auth for a returning user — no UI if a session is still valid. */
export async function signInSilentlyWithGoogle(): Promise<GoogleUser | null> {
  if (!hasGoogleAuth) return null;
  ensureConfigured();
  try {
    const result = await GoogleSignin.signInSilently();
    if (result.type !== "success") return null;
    return toGoogleUser(result.data);
  } catch {
    return null;
  }
}

export function getCurrentGoogleUser(): GoogleUser | null {
  if (!hasGoogleAuth) return null;
  ensureConfigured();
  const current = GoogleSignin.getCurrentUser();
  return current ? toGoogleUser(current) : null;
}

/**
 * Returns a currently-valid Drive-scoped access token, refreshing under
 * the hood via Play Services if needed. Returns null if not signed in —
 * callers should treat that as "try signInSilentlyWithGoogle(), and if
 * that also fails, prompt the person to sign in again."
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  if (!hasGoogleAuth) return null;
  ensureConfigured();
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch {
    return null;
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // already signed out — fine.
  }
}
