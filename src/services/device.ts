// services/device.ts
// Registers this device with the business by writing a JSON file into the
// business folder's devices/ subfolder — the Drive equivalent of the old
// device-register Edge Function. There's no server left to actually reject
// a revoked device's writes, so revocation here is cooperative: this app
// checks its own device record on every sync and signs itself out if it
// finds revoked=true. The real, un-bypassable revoke is removing that
// person's Drive sharing access to the business folder — see more/devices.tsx.

import * as Device from "expo-device";
import { Platform } from "react-native";
import { q, run } from "../database/client";
import { getDeviceId } from "./auth";
import { getCurrentGoogleUser, hasGoogleAuth } from "./googleAuth";
import { getCachedBusinessFolderId, getSubfolderId } from "./businessFolder";
import * as Drive from "./drive";

let registeredThisSession = false;

export function resetDeviceRegistrationCache() {
  registeredThisSession = false;
}

export interface DeviceRecord {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  platform: string;
  revoked: boolean;
  created_at: string;
  last_seen: string;
}

export async function ensureDeviceRegistered(): Promise<boolean> {
  if (!hasGoogleAuth) return false;
  if (registeredThisSession) return true;

  const business = q<any>("SELECT id FROM business LIMIT 1")[0];
  const folderId = getCachedBusinessFolderId();
  if (!business || !folderId) return false; // no business set up locally yet

  const user = getCurrentGoogleUser();
  if (!user) return false;

  const device_id = await getDeviceId();
  const name = Device.modelName || `${Platform.OS} device`;
  const platform = `${Platform.OS} ${Platform.Version ?? ""}`.trim();
  const nowIso = new Date().toISOString();

  const devicesFolderId = await getSubfolderId(folderId, "devices");
  const existing = await Drive.listFiles(
    `'${devicesFolderId}' in parents and name = '${device_id}.json' and trashed = false`,
  );

  const existingCreatedAt = existing.length
    ? (await Drive.readJsonFile<DeviceRecord>(existing[0].id)).created_at
    : nowIso;

  const record: DeviceRecord = {
    id: device_id,
    business_id: business.id,
    user_id: user.id,
    name,
    platform,
    revoked: false,
    created_at: existingCreatedAt,
    last_seen: nowIso,
  };

  if (existing.length) {
    await Drive.updateJsonFile(existing[0].id, record);
  } else {
    await Drive.createJsonFile(`${device_id}.json`, devicesFolderId, record);
  }

  run(
    `INSERT INTO devices(id,business_id,user_id,name,platform,revoked,created_at,last_seen) VALUES(?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,platform=excluded.platform,revoked=excluded.revoked,last_seen=excluded.last_seen`,
    [
      device_id,
      business.id,
      user.id,
      name,
      platform,
      0,
      existingCreatedAt,
      nowIso,
    ],
  );

  registeredThisSession = true;
  return true;
}

/**
 * Checks this device's own record in Drive for revoked=true. Returns true
 * if the device should stop syncing and sign out. Cooperative only — see
 * the file header — but sufficient for a small trusted team where the
 * real access control is Drive sharing, not this flag.
 */
export async function checkSelfRevoked(): Promise<boolean> {
  const folderId = getCachedBusinessFolderId();
  if (!folderId) return false;
  try {
    const device_id = await getDeviceId();
    const devicesFolderId = await getSubfolderId(folderId, "devices");
    const existing = await Drive.listFiles(
      `'${devicesFolderId}' in parents and name = '${device_id}.json' and trashed = false`,
    );
    if (!existing.length) return false;
    const record = await Drive.readJsonFile<DeviceRecord>(existing[0].id);
    return !!record.revoked;
  } catch {
    return false; // network error — don't lock the person out over a blip
  }
}

/** Owner action: flips revoked=true on a device's Drive record (see file header for what this does and doesn't guarantee). */
export async function revokeDevice(deviceId: string): Promise<void> {
  const folderId = getCachedBusinessFolderId();
  if (!folderId) throw new Error("No business folder set up yet");
  const devicesFolderId = await getSubfolderId(folderId, "devices");
  const existing = await Drive.listFiles(
    `'${devicesFolderId}' in parents and name = '${deviceId}.json' and trashed = false`,
  );
  if (!existing.length) throw new Error("Device record not found");
  const record = await Drive.readJsonFile<DeviceRecord>(existing[0].id);
  record.revoked = true;
  await Drive.updateJsonFile(existing[0].id, record);
  run("UPDATE devices SET revoked=1 WHERE id=?", [deviceId]);
}
