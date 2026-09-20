import React from "react";
import { Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Button } from "../../../src/components/ui";
import { money } from "../../../src/utils/format";
import { createSale } from "../../../src/repositories/core";
export default () => {
  const r = useRouter(),
    p = useLocalSearchParams<{ cart: string; method: string }>(),
    items: any[] = JSON.parse(p.cart || "[]"),
    total = items.reduce((a, x) => a + x.quantity * x.selling_price, 0);
  return (
    <Screen title="Payment">
      <Card>
        <Text style={{ color: "#5A6478" }}>Amount due</Text>
        <Text style={{ fontSize: 38, fontWeight: "700", color: "#000060" }}>
          {money(total)}
        </Text>
        <Text>Method: {p.method}</Text>
      </Card>
      <Button
        title="Confirm payment"
        onPress={() => {
          const sale = createSale(items, p.method || "Cash");
          r.push({
            pathname: "/(app)/sell/complete",
            params: {
              id: sale.id,
              receipt: sale.receipt,
              total: String(sale.total),
            },
          } as any);
        }}
      />
    </Screen>
  );
};
