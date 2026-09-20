import React, { useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Button, Card } from "../../../src/components/ui";
import { q } from "../../../src/database/client";
import { setPendingBarcode } from "../../../src/utils/scanBridge";

export default () => {
  const r = useRouter();
  const params = useLocalSearchParams<{ assign?: string }>();
  const assignMode = params.assign === "1";
  const [perm, request] = useCameraPermissions(),
    [code, setCode] = useState("");
  if (!perm?.granted)
    return (
      <Screen title="Barcode scanner">
        <Text>Camera permission is required to scan.</Text>
        <Button title="Allow camera" onPress={() => request()} />
      </Screen>
    );
  const existingProduct = code
    ? q<any>("SELECT * FROM products WHERE barcode=?", [code])[0]
    : undefined;
  return (
    <Screen
      title={assignMode ? "Scan barcode" : "Scan to look up"}
      scroll={false}
    >
      <View
        style={{
          height: 500,
          margin: 16,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={code ? undefined : (res) => setCode(res.data)}
        />
      </View>
      {code && (
        <Card>
          <Text style={{ fontWeight: "700" }}>Barcode found</Text>
          <Text>{code}</Text>
          {assignMode ? (
            <Button
              title="Use this barcode"
              onPress={() => {
                setPendingBarcode(code);
                r.back();
              }}
            />
          ) : (
            <Text style={{ marginTop: 8 }}>
              {existingProduct
                ? existingProduct.name
                : "No product uses this barcode yet."}
            </Text>
          )}
          <Button title="Scan again" secondary onPress={() => setCode("")} />
        </Card>
      )}
    </Screen>
  );
};
