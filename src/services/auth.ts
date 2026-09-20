import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
export const DEVICE_KEY = "shopstock.device_id";
export const getDeviceId = async () => {
  let id = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_KEY, id);
  }
  return id;
};
