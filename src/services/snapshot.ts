// services/snapshot.ts
// Replaces the backend's snapshot-create Edge Function. That version had
// to rebuild materialized state by folding the entire event log, because
// Postgres's `events` table was the source of truth and nothing else. On
// this device, local SQLite already *is* the materialized state — it's
// been kept current by every create*/apply call all along — so a snapshot
// here is just "read the current tables and write them out," no folding
// required. This exists purely to speed up a brand-new device's first
// restore (read one file instead of replaying the whole event history).

import { q } from "../database/client";
import { getCachedBusinessFolderId, getSubfolderId } from "./businessFolder";
import * as Drive from "./drive";

export interface SnapshotPayload {
  meta: {
    business_id: string;
    created_at: string;
  };
  business: any;
  members: any[];
  products: any[];
  categories: any[];
  customers: any[];
  suppliers: any[];
}

export function buildSnapshotPayload(): SnapshotPayload | null {
  const business = q<any>("SELECT * FROM business LIMIT 1")[0];
  if (!business) return null;
  return {
    meta: { business_id: business.id, created_at: new Date().toISOString() },
    business,
    members: q<any>("SELECT * FROM members WHERE business_id=?", [business.id]),
    products: q<any>("SELECT * FROM products WHERE business_id=?", [
      business.id,
    ]),
    categories: q<any>("SELECT * FROM categories WHERE business_id=?", [
      business.id,
    ]),
    customers: q<any>("SELECT * FROM customers WHERE business_id=?", [
      business.id,
    ]),
    suppliers: q<any>("SELECT * FROM suppliers WHERE business_id=?", [
      business.id,
    ]),
  };
}

/** Uploads a fresh snapshot to Drive and prunes older ones, keeping the most recent 10. */
export async function createSnapshot(): Promise<boolean> {
  const folderId = getCachedBusinessFolderId();
  if (!folderId) return false;
  const payload = buildSnapshotPayload();
  if (!payload) return false;

  const snapshotsFolderId = await getSubfolderId(folderId, "snapshots");
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await Drive.createJsonFile(name, snapshotsFolderId, payload);

  const all = await Drive.listFiles(
    `'${snapshotsFolderId}' in parents and trashed = false`,
  );
  const sorted = [...all].sort((a, b) =>
    a.createdTime < b.createdTime ? 1 : -1,
  );
  const stale = sorted.slice(10);
  for (const f of stale) {
    await Drive.deleteFile(f.id).catch(() => {
      // Pruning is a nice-to-have, not correctness-critical — a failed
      // delete just leaves one extra file behind, never a data-loss risk.
    });
  }
  return true;
}

/** Returns the most recently created snapshot's Drive file id, if any. */
export async function getLatestSnapshotId(): Promise<string | null> {
  const folderId = getCachedBusinessFolderId();
  if (!folderId) return null;
  const snapshotsFolderId = await getSubfolderId(folderId, "snapshots");
  const all = await Drive.listFiles(
    `'${snapshotsFolderId}' in parents and trashed = false`,
    "createdTime desc",
  );
  if (!all.length) return null;
  const sorted = [...all].sort((a, b) =>
    a.createdTime < b.createdTime ? 1 : -1,
  );
  return sorted[0].id;
}
