// services/businessFolder.ts
// Replaces the old Postgres `businesses` table. The "business" now IS a
// Drive folder with a known internal layout:
//
//   <business folder>/
//     meta.json         { business_id, name, currency, owner_user_id, created_at, updated_at }
//     devices/           one <device_id>.json per device that's ever synced
//     events/             one <event_id>.json per synced event, flat (device_id is a field inside, not a subfolder — keeps the "list what's new" query a single flat listFiles call)
//     snapshots/          periodic consolidated snapshots (see restore.ts)
//     photos/              product photos, referenced by their Drive file id from PRODUCT_CREATED/UPDATED payloads
//
// The Drive folder's own ID is the only thing that needs to travel between
// people — the owner creates it once, shares it via Drive's own sharing UI
// (or the in-app "share with email" shortcut), and the employee pastes the
// folder link/ID in once during setup.

import { q, run, tx } from "../database/client";
import { uuid, now } from "../utils/id";
import * as Drive from "./drive";
import { getCurrentGoogleUser } from "./googleAuth";

const APP_META_FOLDER_KEY = "drive_business_folder_id";

export interface BusinessMeta {
  business_id: string;
  name: string;
  currency: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

function getAppMeta(key: string): string | null {
  const row = q<any>("SELECT value FROM app_meta WHERE key=?", [key])[0];
  return row ? (row.value as string) : null;
}

function setAppMeta(key: string, value: string) {
  run(
    "INSERT INTO app_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [key, value],
  );
}

export function getCachedBusinessFolderId(): string | null {
  return getAppMeta(APP_META_FOLDER_KEY);
}

function cacheBusinessFolderId(folderId: string) {
  setAppMeta(APP_META_FOLDER_KEY, folderId);
}

/** Standard subfolder names, created once when a business folder is first set up. */
const SUBFOLDERS = ["devices", "events", "snapshots", "photos"] as const;

export async function getSubfolderId(
  businessFolderId: string,
  name: (typeof SUBFOLDERS)[number],
): Promise<string> {
  const cacheKey = `drive_subfolder_${name}`;
  const cached = getAppMeta(cacheKey);
  if (cached) return cached;
  const id = await Drive.findOrCreateFolder(name, businessFolderId);
  setAppMeta(cacheKey, id);
  return id;
}

/**
 * Owner flow: creates a brand-new business folder in Drive, with the
 * standard subfolders and a meta.json, then seeds local state so the app
 * has a `business` row to work from immediately (same as the old
 * Supabase-seeded demo data, but this is the real one).
 */
export async function createNewBusiness(
  businessName: string,
  currency = "NGN",
): Promise<string> {
  const user = getCurrentGoogleUser();
  if (!user) throw new Error("Sign in with Google first");

  const folderId = await Drive.createFolder(businessName);
  for (const sub of SUBFOLDERS) {
    await getSubfolderId(folderId, sub);
  }

  const businessId = uuid();
  const t = now();
  const meta: BusinessMeta = {
    business_id: businessId,
    name: businessName,
    currency,
    owner_user_id: user.id,
    created_at: t,
    updated_at: t,
  };
  await Drive.createJsonFile("meta.json", folderId, meta);

  cacheBusinessFolderId(folderId);
  tx(() => {
    run("INSERT INTO business VALUES(?,?,?,?,?,?)", [
      businessId,
      businessName,
      currency,
      user.id,
      t,
      t,
    ]);
    run("INSERT INTO members VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
      uuid(),
      businessId,
      user.id,
      "OWNER",
      user.name || user.email,
      user.email,
      "",
      1,
      JSON.stringify({}),
      t,
      t,
    ]);
  });

  return folderId;
}

/**
 * Employee flow: validates a pasted folder link/ID actually points at a
 * real, accessible business folder (i.e. the owner has shared it with this
 * Google account already), then fetches meta.json and seeds local state
 * from it. Does not create anything — the owner's createNewBusiness()
 * already did that.
 */
export async function joinExistingBusiness(
  folderLinkOrId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = getCurrentGoogleUser();
  if (!user) return { ok: false, message: "Sign in with Google first." };

  const folderId = Drive.parseDriveIdFromLink(folderLinkOrId);
  const fileMeta = await Drive.getFileMeta(folderId).catch(() => null);
  if (!fileMeta) {
    return {
      ok: false,
      message:
        "Couldn't open that folder. Make sure the owner has shared it with this Google account.",
    };
  }
  if (fileMeta.mimeType !== "application/vnd.google-apps.folder") {
    return { ok: false, message: "That link doesn't point at a folder." };
  }

  const metaFiles = await Drive.listFiles(
    `'${folderId}' in parents and name = 'meta.json' and trashed = false`,
  );
  if (!metaFiles.length) {
    return {
      ok: false,
      message:
        "This doesn't look like a ShopStock business folder (no meta.json found).",
    };
  }
  const meta = await Drive.readJsonFile<BusinessMeta>(metaFiles[0].id);

  cacheBusinessFolderId(folderId);
  tx(() => {
    run(
      `INSERT INTO business(id,name,currency,owner_user_id,created_at,updated_at) VALUES(?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name,currency=excluded.currency,updated_at=excluded.updated_at`,
      [
        meta.business_id,
        meta.name,
        meta.currency,
        meta.owner_user_id,
        meta.created_at,
        meta.updated_at,
      ],
    );
  });

  return { ok: true };
}

/** Owner convenience: shares the business folder with a collaborator's Google account, instead of them having to do it from the Drive app. */
export async function shareBusinessWithEmployee(email: string): Promise<void> {
  const folderId = getCachedBusinessFolderId();
  if (!folderId) throw new Error("No business folder set up yet");
  await Drive.shareWithEmail(folderId, email, "writer");
}
