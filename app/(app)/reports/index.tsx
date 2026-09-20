import React from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button } from "../../../src/components/ui";
import { q } from "../../../src/database/client";
import { money } from "../../../src/utils/format";
export default () => {
  const r = useRouter(),
    s = q<any>(
      "SELECT COALESCE(SUM(total),0) total,COUNT(*) n FROM sales WHERE cancelled=0",
    )[0],
    p = q<any>(
      "SELECT COALESCE(SUM((selling_price-cost_price)*current_stock),0) v FROM products",
    )[0];
  return (
    <Screen title="Reports">
      <Card>
        <Text style={{ fontSize: 25, fontWeight: "700" }}>
          {money(s?.total || 0)}
        </Text>
        <Text>Sales · {s?.n || 0} transactions</Text>
        <Text style={{ marginTop: 8 }}>
          Inventory margin value {money(p?.v || 0)}
        </Text>
      </Card>
      {[
        ["Sales report", "sales"],
        ["Inventory report", "inventory"],
        ["Profit report", "profit"],
        ["Expenses report", "expenses"],
        ["Movements report", "movements"],
      ].map(([n, path]) => (
        <Button
          key={path}
          title={n}
          secondary
          onPress={() => r.push(`/(app)/reports/${path}` as any)}
        />
      ))}
    </Screen>
  );
};
