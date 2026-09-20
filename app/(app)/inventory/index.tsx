import React, { useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Chip, Row, Button } from "../../../src/components/ui";
import { q } from "../../../src/database/client";
import { money } from "../../../src/utils/format";
export default function Inventory() {
  const r = useRouter(),
    [s, setS] = useState(""),
    [cat, setCat] = useState("All");
  const cats = q<any>("SELECT * FROM categories"),
    ps = q<any>(
      "SELECT p.*,c.name cat FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=1 AND (p.name LIKE ? OR p.sku LIKE ?) ORDER BY p.name",
      ["%" + s + "%", "%" + s + "%"],
    ).filter((p) => cat === "All" || p.cat === cat);
  return (
    <Screen title="Inventory">
      <TextInput
        style={{
          height: 48,
          borderWidth: 1,
          borderColor: "#E3E8F0",
          borderRadius: 12,
          padding: 12,
          backgroundColor: "#fff",
          marginBottom: 10,
        }}
        placeholder="Search products or SKU"
        value={s}
        onChangeText={setS}
      />
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <Chip text="All" active={cat === "All"} onPress={() => setCat("All")} />
        {cats.map((c) => (
          <Chip
            key={c.id}
            text={c.name}
            active={cat === c.name}
            onPress={() => setCat(c.name)}
          />
        ))}
      </View>
      <Text style={{ color: "#5A6478", marginBottom: 10 }}>
        {ps.length} products
      </Text>
      {ps.map((p) => (
        <Row
          key={p.id}
          onPress={() => r.push(`/(app)/inventory/${p.id}` as any)}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#E7EFFE",
              marginRight: 12,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {p.image_local_uri ? (
              <Image
                source={{ uri: p.image_local_uri }}
                style={{ width: 44, height: 44 }}
              />
            ) : (
              <Text style={{ color: "#115FE6" }}>□</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700" }}>{p.name}</Text>
            <Text style={{ fontSize: 12, color: "#5A6478" }}>
              {p.sku} · {p.current_stock} {p.unit}
            </Text>
          </View>
          <View>
            <Text style={{ fontWeight: "700" }}>{money(p.selling_price)}</Text>
            <Text
              style={{
                fontSize: 11,
                color:
                  p.current_stock <= p.minimum_stock ? "#C98600" : "#1E9E5A",
              }}
            >
              {p.current_stock === 0
                ? "Out of stock"
                : p.current_stock <= p.minimum_stock
                  ? "Low stock"
                  : "In stock"}
            </Text>
          </View>
        </Row>
      ))}
      <Button
        title="+ New product"
        onPress={() => r.push("/(app)/inventory/edit" as any)}
      />
    </Screen>
  );
}
