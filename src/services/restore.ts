// services/restore.ts
// Bootstraps local state from Drive for a device that has no local
// business row yet — a fresh install, or an employee's device joining a
// business the owner already set up. Reads the latest snapshot (if any),
// applies it, registers the device, then replays every event created
// since that snapshot.

import { run, tx } from "../database/client";
import { getDeviceId } from "./auth";
import { ensureDeviceRegistered, resetDeviceRegistrationCache } from "./device";
import { hasGoogleAuth } from "./googleAuth";
import { getCachedBusinessFolderId, getSubfolderId } from "./businessFolder";
import { getLatestSnapshotId, SnapshotPayload } from "./snapshot";
import * as Drive from "./drive";
import { applyIncomingEvents } from "../sync/apply";

export interface RestoreResult {
  ok: boolean;
  message: string;
}

function applySnapshotPayload(payload: SnapshotPayload) {
  tx(() => {
    const b = payload.business;
    if (b) {
      run(
        `INSERT INTO business(id,name,currency,owner_user_id,created_at,updated_at) VALUES(?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,currency=excluded.currency,owner_user_id=excluded.owner_user_id,updated_at=excluded.updated_at`,
        [b.id, b.name, b.currency, b.owner_user_id, b.created_at, b.updated_at],
      );
    }
    for (const m of payload.members || []) {
      run(
        `INSERT INTO members(id,business_id,user_id,role,full_name,email,phone,active,permissions,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET role=excluded.role,full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,active=excluded.active,permissions=excluded.permissions,updated_at=excluded.updated_at`,
        [
          m.id,
          m.business_id,
          m.user_id,
          m.role,
          m.full_name,
          m.email || "",
          m.phone || "",
          m.active ? 1 : 0,
          typeof m.permissions === "string"
            ? m.permissions
            : JSON.stringify(m.permissions || {}),
          m.created_at,
          m.updated_at,
        ],
      );
    }
    for (const c of payload.categories || []) {
      run(
        `INSERT OR REPLACE INTO categories(id,business_id,name,created_at) VALUES(?,?,?,?)`,
        [c.id, c.business_id, c.name, c.created_at],
      );
    }
    for (const p of payload.products || []) {
      run(
        `INSERT INTO products(id,business_id,name,sku,barcode,category_id,supplier_id,cost_price,selling_price,current_stock,minimum_stock,unit,active,created_at,updated_at,image_local_uri,image_drive_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,sku=excluded.sku,barcode=excluded.barcode,category_id=excluded.category_id,supplier_id=excluded.supplier_id,cost_price=excluded.cost_price,selling_price=excluded.selling_price,current_stock=excluded.current_stock,minimum_stock=excluded.minimum_stock,unit=excluded.unit,active=excluded.active,updated_at=excluded.updated_at,image_drive_id=excluded.image_drive_id`,
        [
          p.id,
          p.business_id,
          p.name,
          p.sku,
          p.barcode || null,
          p.category_id || null,
          p.supplier_id || null,
          p.cost_price,
          p.selling_price,
          p.current_stock,
          p.minimum_stock,
          p.unit,
          p.active ? 1 : 0,
          p.created_at,
          p.updated_at,
          null, // image_local_uri: never carried in a snapshot, re-downloaded on demand (see sync engine's photo sweep)
          p.image_drive_id || null,
        ],
      );
    }
    for (const c of payload.customers || []) {
      run(
        `INSERT OR REPLACE INTO customers(id,business_id,name,phone,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
        [
          c.id,
          c.business_id,
          c.name,
          c.phone || "",
          c.notes || "",
          c.created_at,
          c.updated_at,
        ],
      );
    }
    for (const s of payload.suppliers || []) {
      run(
        `INSERT OR REPLACE INTO suppliers(id,business_id,name,phone,address,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
        [
          s.id,
          s.business_id,
          s.name,
          s.phone || "",
          s.address || "",
          s.notes || "",
          s.created_at,
          s.updated_at,
        ],
      );
    }
  });
}

export async function restoreFromCloud(): Promise<RestoreResult> {
  if (!hasGoogleAuth) {
    return {
      ok: false,
      message: "Google Drive sync isn't configured on this build.",
    };
  }

  const folderId = getCachedBusinessFolderId();
  if (!folderId) {
    return {
      ok: false,
      message: "No business folder set up yet — create or join one first.",
    };
  }

  let sinceCursor = "1970-01-01T00:00:00.000Z";
  const snapshotId = await getLatestSnapshotId().catch(() => null);
  if (snapshotId) {
    const payload = await Drive.readJsonFile<SnapshotPayload>(snapshotId).catch(
      () => null,
    );
    if (!payload) {
      return { ok: false, message: "Failed to download the latest snapshot." };
    }
    applySnapshotPayload(payload);
    sinceCursor = payload.meta.created_at;
  }

  resetDeviceRegistrationCache();
  const registered = await ensureDeviceRegistered();
  if (!registered) {
    return {
      ok: true,
      message:
        "Restored the latest snapshot. Device registration will finish on the next sync.",
    };
  }

  const deviceId = await getDeviceId();
  const eventsFolderId = await getSubfolderId(folderId, "events");
  const files = await Drive.listFiles(
    `'${eventsFolderId}' in parents and trashed = false and createdTime > '${sinceCursor}'`,
    "createdTime",
  );

  if (files.length > 0) {
    const incoming: any[] = [];
    for (const f of files) {
      const content = await Drive.readJsonFile<any>(f.id);
      if (content.device_id === deviceId) continue;
      incoming.push({ ...content, server_sequence: Date.parse(f.createdTime) });
    }
    if (incoming.length > 0) applyIncomingEvents(incoming);
    const maxCursor = files[files.length - 1].createdTime;
    run(
      "UPDATE sync_state SET last_downloaded_cursor=?,last_successful_sync_at=? WHERE id=1",
      [maxCursor, new Date().toISOString()],
    );
  } else {
    run(
      "UPDATE sync_state SET last_downloaded_cursor=?,last_successful_sync_at=? WHERE id=1",
      [sinceCursor, new Date().toISOString()],
    );
  }

  return { ok: true, message: "Restore complete." };
}
