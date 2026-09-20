import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen, Field, Button, Chip, s } from "../../../src/components/ui";
import { q } from "../../../src/database/client";
import { createProduct } from "../../../src/repositories/core";
import {
  takeProductPhoto,
  pickProductPhoto,
} from "../../../src/services/photos";
import { consumePendingBarcode } from "../../../src/utils/scanBridge";
import { uuid } from "../../../src/utils/id";
import { colors } from "../../../src/constants/theme";

const UNITS = ["pcs", "kg", "box", "pair", "dozen", "litre", "set", "bag"];

export default function NewProduct() {
  const r = useRouter(),
    categories = q<any>("SELECT * FROM categories"),
    suppliers = q<any>("SELECT * FROM suppliers"),
    [productId] = useState(() => uuid()),
    [photoUri, setPhotoUri] = useState<string | null>(null),
    [n, setN] = useState(""),
    [sku, setSku] = useState(""),
    [barcode, setBarcode] = useState(""),
    [cost, setCost] = useState(""),
    [sell, setSell] = useState(""),
    [stock, setStock] = useState(""),
    [min, setMin] = useState(""),
    [categoryId, setCategoryId] = useState<string | null>(
      categories[0]?.id || null,
    ),
    [supplierId, setSupplierId] = useState<string | null>(null),
    [unit, setUnit] = useState("pcs"),
    [saving, setSaving] = useState(false);

  // Fires when this screen regains focus — including after the barcode
  // scanner is dismissed via router.back(). A plain useEffect wouldn't
  // re-run here since this screen never unmounts while the scanner sits
  // on top of it in the stack.
  useFocusEffect(
    React.useCallback(() => {
      const scanned = consumePendingBarcode();
      if (scanned) setBarcode(scanned);
    }, []),
  );

  const choosePhoto = () => {
    Alert.alert("Product photo", undefined, [
      {
        text: "Take photo",
        onPress: async () => {
          const uri = await takeProductPhoto(productId);
          if (uri) setPhotoUri(uri);
        },
      },
      {
        text: "Choose from gallery",
        onPress: async () => {
          const uri = await pickProductPhoto(productId);
          if (uri) setPhotoUri(uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const save = () => {
    if (!n.trim()) {
      Alert.alert("Name required", "Give the product a name first.");
      return;
    }
    if (!categoryId) {
      Alert.alert("Category required", "Pick a category, or add one first.");
      return;
    }
    setSaving(true);
    try {
      createProduct({
        id: productId,
        name: n.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || null,
        cost_price: cost,
        selling_price: sell,
        current_stock: stock,
        minimum_stock: min,
        category_id: categoryId,
        supplier_id: supplierId,
        unit,
        image_local_uri: photoUri,
      });
      r.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="New product">
      <Pressable
        onPress={choosePhoto}
        style={{ alignSelf: "center", marginBottom: 16 }}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: 140, height: 140, borderRadius: 16 }}
          />
        ) : (
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 16,
              backgroundColor: "#EEF1F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.textMuted, textAlign: "center" }}>
              Tap to add{"\n"}a photo
            </Text>
          </View>
        )}
      </Pressable>

      <Field
        label="Name"
        value={n}
        onChangeText={setN}
        placeholder="e.g. Nike Air Force 1"
      />
      <Field
        label="SKU"
        value={sku}
        onChangeText={setSku}
        placeholder="Optional"
      />

      <Field
        label="Barcode"
        value={barcode}
        onChangeText={setBarcode}
        placeholder="Optional"
      />
      <Button
        title="Scan barcode"
        secondary
        onPress={() =>
          r.push({
            pathname: "/(app)/inventory/scan",
            params: { assign: "1" },
          } as any)
        }
      />

      <Text style={s.label}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        {categories.map((c) => (
          <Chip
            key={c.id}
            text={c.name}
            active={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </ScrollView>
      {categories.length === 0 && (
        <Button
          title="Add a category first"
          secondary
          onPress={() => r.push("/(app)/inventory/categories" as any)}
        />
      )}

      <Text style={s.label}>Supplier (optional)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        <Chip
          text="None"
          active={!supplierId}
          onPress={() => setSupplierId(null)}
        />
        {suppliers.map((sup) => (
          <Chip
            key={sup.id}
            text={sup.name}
            active={supplierId === sup.id}
            onPress={() => setSupplierId(sup.id)}
          />
        ))}
      </ScrollView>

      <Field
        label="Cost price"
        value={cost}
        onChangeText={setCost}
        keyboardType="numeric"
      />
      <Field
        label="Selling price"
        value={sell}
        onChangeText={setSell}
        keyboardType="numeric"
      />
      <Field
        label="Opening stock"
        value={stock}
        onChangeText={setStock}
        keyboardType="numeric"
      />
      <Field
        label="Minimum stock"
        value={min}
        onChangeText={setMin}
        keyboardType="numeric"
      />

      <Text style={s.label}>Unit</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        {UNITS.map((u) => (
          <Chip
            key={u}
            text={u}
            active={unit === u}
            onPress={() => setUnit(u)}
          />
        ))}
      </ScrollView>

      <Button
        title={saving ? "Saving…" : "Save product"}
        disabled={saving}
        onPress={save}
      />
    </Screen>
  );
}
