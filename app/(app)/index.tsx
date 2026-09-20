import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Screen,
  Card,
  Button,
  Metric,
  Title,
  Chip,
  Row,
} from "../../src/components/ui";
import { q } from "../../src/database/client";
import { money } from "../../src/utils/format";
import SyncPill from "../../src/components/SyncPill";
import { useApp } from "../../src/context/AppContext";
export default function Dashboard() {
  const r = useRouter(),
    a = useApp();
  const ps = q<any>("SELECT * FROM products WHERE active=1");
  const low = ps.filter(
      (p) => p.current_stock > 0 && p.current_stock <= p.minimum_stock,
    ),
    out = ps.filter((p) => p.current_stock === 0);
  const sales =
    q<any>(
      `SELECT COALESCE(SUM(total),0) total,COUNT(*) tx FROM sales WHERE date(created_at)=date('now','localtime') AND cancelled=0`,
    )[0] || {};
  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 15,
        }}
      >
        <View>
          <Text style={{ fontSize: 14, color: "#5A6478" }}>
            Good morning, {a.user?.name?.split(" ")[0]}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#000060" }}>
            MD Collections
          </Text>
        </View>
        <SyncPill />
      </View>
      <Card>
        <Title>Today</Title>
        <View style={{ flexDirection: "row" }}>
          <Metric label="Sales" value={money(sales.total || 0)} />
          <Metric label="Items" value="0" />
          <Metric label="Txns" value={sales.tx || 0} />
          <Metric label="Profit" value={money(0)} />
        </View>
      </Card>
      <Title>Quick actions</Title>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {[
          ["Sell", "/(app)/sell"],
          ["Add stock", "/(app)/inventory/movements/new"],
          ["New product", "/(app)/inventory/edit"],
          ["Expenses", "/(app)/more/expenses/new"],
        ].map(([x, p]) => (
          <View key={x} style={{ width: "50%", padding: 4 }}>
            <Button
              title={x}
              onPress={() => r.push(p as any)}
              secondary={x !== "Sell"}
            />
          </View>
        ))}
      </View>
      <Card>
        <Title>Inventory</Title>
        <View style={{ flexDirection: "row" }}>
          <Metric label="Products" value={ps.length} />
          <Metric label="Low stock" value={low.length} />
          <Metric label="Out of stock" value={out.length} />
        </View>
        {low.slice(0, 4).map((p) => (
          <Chip key={p.id} text={`${p.name} · ${p.current_stock}`} />
        ))}
      </Card>
      <Title>Recent activity</Title>
      {q<any>(
        "SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 5",
      ).map((x) => (
        <Row key={x.id}>
          <Text>{x.action}</Text>
        </Row>
      ))}
    </Screen>
  );
}
