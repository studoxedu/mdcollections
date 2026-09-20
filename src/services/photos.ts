// services/photos.ts
// Manages product photos on-device. Pictures from expo-image-picker land in
// a temporary cache location that the OS can clear at any time, so every
// picked photo gets copied into a stable path under the app's document
// directory (Paths.document/products/<product_id>.jpg) immediately —
// that's the file products.image_local_uri points at, and the only one
// that's safe to reference indefinitely or hand to the Drive uploader.

import * as ImagePicker from "expo-image-picker";
import { Directory, File, Paths } from "expo-file-system";

const productsDir = () => new Directory(Paths.document, "products");

export function ensureProductsDir(): Directory {
  const dir = productsDir();
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function localPhotoPathFor(productId: string): string {
  return new File(ensureProductsDir(), `${productId}.jpg`).uri;
}

async function requestPermission(
  fn: () => Promise<ImagePicker.PermissionResponse>,
): Promise<boolean> {
  const result = await fn();
  return result.granted;
}

/**
 * Opens the camera, saves the shot to this product's stable local path, and
 * returns the local file:// URI. Returns null if the person cancels or
 * denies the camera permission.
 */
export async function takeProductPhoto(
  productId: string,
): Promise<string | null> {
  const granted = await requestPermission(
    ImagePicker.requestCameraPermissionsAsync,
  );
  if (!granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return savePickedPhoto(productId, result.assets[0].uri);
}

/**
 * Opens the photo gallery, saves the selection to this product's stable
 * local path, and returns the local file:// URI. Returns null if the
 * person cancels or denies the media-library permission.
 */
export async function pickProductPhoto(
  productId: string,
): Promise<string | null> {
  const granted = await requestPermission(
    ImagePicker.requestMediaLibraryPermissionsAsync,
  );
  if (!granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return savePickedPhoto(productId, result.assets[0].uri);
}

async function savePickedPhoto(
  productId: string,
  pickedUri: string,
): Promise<string> {
  ensureProductsDir();
  const dest = new File(productsDir(), `${productId}.jpg`);
  if (dest.exists) dest.delete();
  const picked = new File(pickedUri);
  await picked.copy(dest);
  return dest.uri;
}

export function deleteLocalPhoto(productId: string): void {
  const file = new File(productsDir(), `${productId}.jpg`);
  if (file.exists) file.delete();
}

export function localPhotoExists(productId: string): boolean {
  return new File(productsDir(), `${productId}.jpg`).exists;
}
