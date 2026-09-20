// services/session.ts
// core.ts's repository functions default their `user`/`device` parameters
// to whatever this module currently holds. Previously those defaults were
// hardcoded literal strings ("local-owner"/"local") that never matched a
// real device row or a real Supabase auth user id, so the backend would
// reject every synced event as coming from an unknown device. This module
// gets populated with the real values at app boot (and updated on sign-in)
// so the defaults are actually correct without having to touch every call
// site across the app.

let currentUserId = "local-owner";
let currentDeviceId = "local";

export function setCurrentSession(opts: {
  userId?: string;
  deviceId?: string;
}) {
  if (opts.userId) currentUserId = opts.userId;
  if (opts.deviceId) currentDeviceId = opts.deviceId;
}

export function getCurrentUserId(): string {
  return currentUserId;
}

export function getCurrentDeviceId(): string {
  return currentDeviceId;
}
