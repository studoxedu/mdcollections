import * as Crypto from "expo-crypto";
export const uuid = () => Crypto.randomUUID();
export const now = () => new Date().toISOString();
