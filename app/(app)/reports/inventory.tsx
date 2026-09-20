import React from "react";
import { Text, View } from "react-native";
import {
  Screen,
  Card,
  Title,
  Metric,
  Row,
  Empty,
} from "../../../src/components/ui";
import Bar from "../../../src/components/Bar";
import { q } from "../../../src/database/client";
import { money } from "../../../src/utils/format";
import { colors } from "../../../src/constants/theme";

export default () => {
  const totals = q<any>(
    `SELECT
       COALESCE(SUM(cost_price*current_stock),0) costValue,
       COALESCE(SUM(selling_price*current_stock),0) retailValue,
       COALESCE(SUM(CASE WHEN current_stock <= minimum_stock AND current_stock > 0 THEN 1 ELSE 0 END),0) lowCount,
       COALESCE(SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END),0) outCount
     FROM products WHERE active=1`,
  )[0];

  const byCategory = q<any>(
    `SELECT COALESCE(c.name,'Uncategorised') name, SUM(p.selling_price*p.current_stock) v
     FROM products p LEFT JOIN categories c ON c.id=p.category_id
     WHERE p.active=1 GROUP BY name ORDER BY v DESC LIMIT 6`,
  );
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.v));

  const attention = q<any>(
    `SELECT * FROM products WHERE active=1 AND current_stock <= minimum_stock
     ORDER BY current_stock ASC LIMIT 8`,
  );

  return (
    <Screen title="Inventory report">
      <Card>
        <Title>Stock position</Title>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Metric label="Cost value" value={money(totals.costValue)} />
          <Metric label="Retail value" value={money(totals.retailValue)} />
          <Metric label="Low stock" value={totals.lowCount} />
          <Metric label="Out of stock" value={totals.outCount} />
        </View>
      </Card>

      <Card>
        <Title>Retail value by category</Title>
        {byCategory.length === 0 && <Empty text="No categories yet." />}
        {byCategory.map((c) => (
          <View key={c.name} style={{ marginBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {c.name}
              </Text>
              <Text style={{ fontWeight: "700", fontSize: 12 }}>
                {money(c.v)}
              </Text>
            </View>
            <Bar value={c.v} max={maxCategory} />
          </View>
        ))}
      </Card>

      <Card>
        <Title>Needs attention</Title>
        {attention.length === 0 && (
          <Empty text="Nothing is low or out of stock." />
        )}
        {attention.map((p) => (
          <Row key={p.id}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{p.name}</Text>
              <Text style={{ color: colors.textMuted }}>{p.sku}</Text>
            </View>
            <Text
              style={{
                fontWeight: "700",
                color: p.current_stock <= 0 ? colors.danger : colors.warning,
              }}
            >
              {p.current_stock} left
            </Text>
          </Row>
        ))}
      </Card>
    </Screen>
  );
};
