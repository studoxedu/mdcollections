// utils/scanBridge.ts
// expo-router doesn't have a built-in "return a result to the calling
// screen" mechanism, and Android has no Alert.prompt to fall back on for
// quick single-value UI. A tiny in-memory handoff is simpler than routing
// a value through navigation params: the scanner writes here and calls
// router.back(); the product form reads it in a useFocusEffect, which
// fires when it regains focus after the scanner is dismissed.

let pendingBarcode: string | null = null;

export function setPendingBarcode(code: string) {
  pendingBarcode = code;
}

export function consumePendingBarcode(): string | null {
  const value = pendingBarcode;
  pendingBarcode = null;
  return value;
}
