import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Chip, Button } from "../../../src/components/ui";
import { q } from "../../../src/database/client";
import { money } from "../../../src/utils/format";
export default () => {
  const r = useRouter(),
    [cart, setCart] = useState<any[]>([]),
    [s, setS] = useState("");
  const ps = q<any>(
    "SELECT * FROM products WHERE active=1 AND current_stock>0 AND name LIKE ? ORDER BY name",
    ["%" + s + "%"],
  );
  const add = (p: any) =>
    setCart((c) => {
      const f = c.find((x) => x.id === p.id);
      return f
        ? c.map((x) => (x.id === p.id ? { ...x, quantity: x.quantity + 1 } : x))
        : [...c, { ...p, quantity: 1 }];
    });
  return (
    <Screen title="Sell">
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 18 }}>Find products</Text>
        <Button title="Search products" secondary onPress={() => {}} />
      </Card>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {ps.map((p) => (
          <View key={p.id} style={{ width: "50%", padding: 4 }}>
            <Card>
              <Text style={{ fontWeight: "700" }}>{p.name}</Text>
              <Text style={{ color: "#5A6478" }}>
                {p.current_stock} in stock
              </Text>
              <Text style={{ fontWeight: "700", marginVertical: 6 }}>
                {money(p.selling_price)}
              </Text>
              <Button title="Add" onPress={() => add(p)} />
            </Card>
          </View>
        ))}
      </View>
      {cart.length > 0 && (
        <Card>
          <Text style={{ fontWeight: "700" }}>
            Cart · {cart.reduce((a, x) => a + x.quantity, 0)} items
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>
            {money(cart.reduce((a, x) => a + x.quantity * x.selling_price, 0))}
          </Text>
          <Button
            title="Review cart"
            onPress={() =>
              r.push({
                pathname: "/(app)/sell/review",
                params: { cart: JSON.stringify(cart) },
              } as any)
            }
          />
        </Card>
      )}
    </Screen>
  );
};
