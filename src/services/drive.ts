// services/drive.ts
// Thin wrapper over the Drive REST API v3, used as the sync transport in
// place of the old Supabase Edge Functions. No SDK — googleapis (Node) isn't
// built for React Native, so this talks to the REST endpoints directly with
// fetch and expo-file-system.
//
// Upload strategy: every write is two steps — (1) create file metadata via
// a plain JSON POST, which returns a file id, then (2) PATCH that file's
// content via the /upload endpoint. This avoids hand-rolling a multipart
// body (fragile over fetch in RN) in favor of two simple, well-supported
// requests. For JSON content this is just two fetch calls; for photos, step
// 2 uses FileSystem.uploadAsync's BINARY_CONTENT mode so the image bytes
// stream from disk natively instead of loading the whole file into a JS
// string.

import { Directory, File, UploadType } from "expo-file-system";
import { getGoogleAccessToken } from "./googleAuth";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export class DriveError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getGoogleAccessToken();
  if (!token) throw new DriveError("Not signed in to Google Drive");
  return { Authorization: `Bearer ${token}` };
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

/** Finds a folder by exact name under a given parent (or Drive root). */
export async function findFolder(
  name: string,
  parentId?: string,
): Promise<string | null> {
  const headers = await authHeaders();
  const q = [
    `name = '${escapeQueryValue(name)}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
    `'${parentId ?? "root"}' in parents`,
  ].join(" and ");
  const res = await fetch(
    `${API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers },
  );
  if (!res.ok)
    throw new DriveError(`findFolder failed: ${res.status}`, res.status);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function createFolder(
  name: string,
  parentId?: string,
): Promise<string> {
  const headers = await authHeaders();
  const res = await fetch(`${API}/files`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  if (!res.ok)
    throw new DriveError(`createFolder failed: ${res.status}`, res.status);
  const data = await res.json();
  return data.id;
}

export async function findOrCreateFolder(
  name: string,
  parentId?: string,
): Promise<string> {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;
  return createFolder(name, parentId);
}

/** Fetches basic metadata (name, owners, permissions) for a folder — used to validate a pasted folder ID/link before trusting it. */
export async function getFileMeta(
  fileId: string,
): Promise<{ id: string; name: string; mimeType: string } | null> {
  const headers = await authHeaders();
  const res = await fetch(`${API}/files/${fileId}?fields=id,name,mimeType`, {
    headers,
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new DriveError(`getFileMeta failed: ${res.status}`, res.status);
  return res.json();
}

async function createFileMetadata(
  name: string,
  parentId: string,
  mimeType: string,
): Promise<string> {
  const headers = await authHeaders();
  const res = await fetch(`${API}/files`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name, parents: [parentId], mimeType }),
  });
  if (!res.ok)
    throw new DriveError(
      `createFileMetadata failed: ${res.status}`,
      res.status,
    );
  const data = await res.json();
  return data.id;
}

async function writeJsonContent(fileId: string, obj: unknown): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  });
  if (!res.ok)
    throw new DriveError(`writeJsonContent failed: ${res.status}`, res.status);
}

/** Creates a new JSON file and returns its Drive file id. */
export async function createJsonFile(
  name: string,
  parentId: string,
  obj: unknown,
): Promise<string> {
  const fileId = await createFileMetadata(name, parentId, "application/json");
  await writeJsonContent(fileId, obj);
  return fileId;
}

/** Overwrites the content of an existing JSON file in place. */
export async function updateJsonFile(
  fileId: string,
  obj: unknown,
): Promise<void> {
  await writeJsonContent(fileId, obj);
}

export async function readJsonFile<T = unknown>(fileId: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API}/files/${fileId}?alt=media`, { headers });
  if (!res.ok)
    throw new DriveError(`readJsonFile failed: ${res.status}`, res.status);
  return res.json();
}

/** Lists every file matching a Drive query, paging through results (Drive caps a single page at 1000). */
export async function listFiles(
  query: string,
  orderBy?: string,
): Promise<DriveFile[]> {
  const headers = await authHeaders();
  const all: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken, files(id,name,createdTime)",
      pageSize: "1000",
    });
    if (orderBy) params.set("orderBy", orderBy);
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API}/files?${params.toString()}`, { headers });
    if (!res.ok)
      throw new DriveError(`listFiles failed: ${res.status}`, res.status);
    const data = await res.json();
    all.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}

/** Uploads a local image file (by file:// URI) to Drive and returns its file id. */
export async function uploadPhoto(
  name: string,
  parentId: string,
  localUri: string,
): Promise<string> {
  const fileId = await createFileMetadata(name, parentId, "image/jpeg");
  const token = await getGoogleAccessToken();
  if (!token) throw new DriveError("Not signed in to Google Drive");
  const file = new File(localUri);
  const result = await file.upload(
    `${UPLOAD_API}/files/${fileId}?uploadType=media`,
    {
      httpMethod: "PATCH",
      uploadType: UploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/jpeg",
      },
    },
  );
  if (result.status < 200 || result.status >= 300) {
    throw new DriveError(`uploadPhoto failed: ${result.status}`, result.status);
  }
  return fileId;
}

/** Downloads a Drive file's binary content into `destDir/fileName`, overwriting any existing copy, and returns the resulting local file:// URI. */
export async function downloadToFile(
  fileId: string,
  destDir: Directory,
  fileName: string,
): Promise<string> {
  const token = await getGoogleAccessToken();
  if (!token) throw new DriveError("Not signed in to Google Drive");
  if (!destDir.exists) destDir.create({ intermediates: true });
  const destFile = new File(destDir, fileName);
  const downloaded = await File.downloadFileAsync(
    `${API}/files/${fileId}?alt=media`,
    destFile,
    { headers: { Authorization: `Bearer ${token}` }, idempotent: true },
  );
  return downloaded.uri;
}

/** Shares a file/folder with another Google account (owner sharing the business folder with an employee, done from within the app instead of the Drive UI). */
export async function shareWithEmail(
  fileId: string,
  email: string,
  role: "writer" | "reader" = "writer",
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(
    `${API}/files/${fileId}/permissions?sendNotificationEmail=true`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ role, type: "user", emailAddress: email }),
    },
  );
  if (!res.ok)
    throw new DriveError(`shareWithEmail failed: ${res.status}`, res.status);
}

/** Deletes a file or folder outright (used to prune old snapshots). */
export async function deleteFile(fileId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API}/files/${fileId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok && res.status !== 404) {
    throw new DriveError(`deleteFile failed: ${res.status}`, res.status);
  }
}

/** Extracts a Drive file/folder ID from a pasted share link, or returns the input unchanged if it's already a bare ID. */
export function parseDriveIdFromLink(input: string): string {
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];
  return trimmed;
}
