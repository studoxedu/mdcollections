import { hasGoogleAuth } from "../services/googleAuth";
import { ensureDeviceRegistered, checkSelfRevoked } from "../services/device";
import {
  getCachedBusinessFolderId,
  getSubfolderId,
} from "../services/businessFolder";
import * as Drive from "../services/drive";
import { pendingEvents } from "./outbox";
import { run, one, q } from "../database/client";
import { applyIncomingEvents } from "./apply";
import { getDeviceId } from "../services/auth";
import { signOutGoogle } from "../services/googleAuth";
import { updateProduct } from "../repositories/core";
import { ensureProductsDir } from "../services/photos";

let syncing = false;

// Uploads any product photo taken locally that hasn't reached Drive yet,
// and downloads any product photo another device uploaded that this one
// doesn't have cached — the two are symmetric passes over the same
// image_local_uri/image_drive_id pair. Kept out of the critical path of
// saving a product (see createProduct/updateProduct in core.ts): taking a
// photo and hitting save is instant and fully offline; this is what makes
// it actually show up elsewhere.
async function syncProductPhotos(businessFolderId: string) {
  const photosFolderId = await getSubfolderId(businessFolderId, "photos");

  const toUpload = q<any>(
    "SELECT id, image_local_uri FROM products WHERE image_local_uri IS NOT NULL AND image_drive_id IS NULL",
  );
  for (const prod of toUpload) {
    try {
      const driveId = await Drive.uploadPhoto(
        `${prod.id}.jpg`,
        photosFolderId,
        prod.image_local_uri,
      );
      updateProduct(prod.id, { image_drive_id: driveId });
    } catch (err) {
      console.warn("[ShopStock] photo upload failed for", prod.id, err);
    }
  }

  const toDownload = q<any>(
    "SELECT id, image_drive_id FROM products WHERE image_drive_id IS NOT NULL AND image_local_uri IS NULL",
  );
  if (toDownload.length > 0) {
    const dir = ensureProductsDir();
    for (const prod of toDownload) {
      try {
        const localUri = await Drive.downloadToFile(
          prod.image_drive_id,
          dir,
          `${prod.id}.jpg`,
        );
        run("UPDATE products SET image_local_uri=? WHERE id=?", [
          localUri,
          prod.id,
        ]);
      } catch (err) {
        console.warn("[ShopStock] photo download failed for", prod.id, err);
      }
    }
  }
}

export async function runSync() {
  if (syncing || !hasGoogleAuth) return;
  syncing = true;
  try {
    if (await checkSelfRevoked()) {
      await signOutGoogle();
      return;
    }

    const registered = await ensureDeviceRegistered();
    if (!registered) return; // not signed in yet, or no local business to register against

    const folderId = getCachedBusinessFolderId();
    if (!folderId) return;
    const eventsFolderId = await getSubfolderId(folderId, "events");
    const deviceId = await getDeviceId();

    // PUSH: each pending local event becomes its own file. Every failure
    // here is transient (network/auth) — Drive does no schema validation
    // the way the old backend did, so there's no "permanently rejected"
    // case to short-circuit; just record the error and retry next cycle.
    const pending = pendingEvents(200);
    for (const e of pending) {
      try {
        await Drive.createJsonFile(`${e.event_id}.json`, eventsFolderId, {
          event_id: e.event_id,
          business_id: e.business_id,
          device_id: e.device_id,
          user_id: e.user_id,
          event_type: e.event_type,
          entity_id: e.entity_id,
          payload: e.payload,
          client_created_at: e.client_created_at,
        });
        run(`UPDATE sync_events SET sync_status='ACCEPTED' WHERE event_id=?`, [
          e.event_id,
        ]);
      } catch (err) {
        run(
          `UPDATE sync_events SET retry_count=retry_count+1,last_error=? WHERE event_id=?`,
          [String(err), e.event_id],
        );
      }
    }

    // PULL: list event files created since the last cursor. A device never
    // needs to re-apply its own events — its local state was already
    // updated at creation time — so those are filtered out here rather
    // than relying on processed_events, which only tracks events that
    // arrived *through* apply in the first place.
    const state: any = one("SELECT * FROM sync_state WHERE id=1");
    const cursor = state?.last_downloaded_cursor || "1970-01-01T00:00:00.000Z";
    const files = await Drive.listFiles(
      `'${eventsFolderId}' in parents and trashed = false and createdTime > '${cursor}'`,
      "createdTime",
    );

    if (files.length > 0) {
      const incoming: any[] = [];
      for (const f of files) {
        const content = await Drive.readJsonFile<any>(f.id);
        if (content.device_id === deviceId) continue;
        incoming.push({
          ...content,
          server_sequence: Date.parse(f.createdTime),
        });
      }
      if (incoming.length > 0) applyIncomingEvents(incoming);
      const maxCursor = files[files.length - 1].createdTime;
      run(
        "UPDATE sync_state SET last_downloaded_cursor=?,last_successful_sync_at=?,pending_event_count=(SELECT COUNT(*) FROM sync_events WHERE sync_status='PENDING') WHERE id=1",
        [maxCursor, new Date().toISOString()],
      );
    } else {
      run(
        "UPDATE sync_state SET last_successful_sync_at=?,pending_event_count=(SELECT COUNT(*) FROM sync_events WHERE sync_status='PENDING') WHERE id=1",
        [new Date().toISOString()],
      );
    }

    await syncProductPhotos(folderId);
  } catch (e) {
    console.warn("[ShopStock] sync failed", e);
  } finally {
    syncing = false;
  }
}
