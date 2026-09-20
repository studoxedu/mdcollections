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
import { money, dateOnly } from "../../../src/utils/format";
import { colors } from "../../../src/constants/theme";

const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

export default () => {
  const totals = q<any>(
    `SELECT
       COALESCE(SUM(si.line_total),0) revenue,
       COALESCE(SUM(si.cost_price*si.quantity),0) cogs
     FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.cancelled=0`,
  )[0];
  const grossProfit = totals.revenue - totals.cogs;
  const margin = totals.revenue > 0 ? (grossProfit / totals.revenue) * 100 : 0;

  const days = last7Days();
  const dailyRows = q<any>(
    `SELECT substr(s.created_at,1,10) day,
            SUM(si.line_total) - SUM(si.cost_price*si.quantity) profit
     FROM sale_items si JOIN sales s ON s.id=si.sale_id
     WHERE s.cancelled=0 GROUP BY day`,
  );
  const byDay: Record<string, number> = Object.fromEntries(
    dailyRows.map((r) => [r.day, r.profit]),
  );
  const trend = days.map((d) => byDay[d] || 0);
  const maxTrend = Math.max(1, ...trend);

  const topProducts = q<any>(
    `SELECT si.product_name name,
            SUM(si.line_total) - SUM(si.cost_price*si.quantity) profit,
            SUM(si.quantity) units
     FROM sale_items si JOIN sales s ON s.id=si.sale_id
     WHERE s.cancelled=0 GROUP BY si.product_id ORDER BY profit DESC LIMIT 6`,
  );

  return (
    <Screen title="Profit report">
      <Card>
        <Title>This period</Title>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Metric label="Revenue" value={money(totals.revenue)} />
          <Metric label="Cost of goods" value={money(totals.cogs)} />
          <Metric label="Gross profit" value={money(grossProfit)} />
          <Metric label="Margin" value={`${margin.toFixed(0)}%`} />
        </View>
      </Card>

      <Card>
        <Title>Last 7 days</Title>
        {days.map((d, i) => (
          <View key={d} style={{ marginBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {dateOnly(d)}
              </Text>
              <Text style={{ fontWeight: "700", fontSize: 12 }}>
                {money(trend[i])}
              </Text>
            </View>
            <Bar value={Math.max(0, trend[i])} max={maxTrend} />
          </View>
        ))}
      </Card>

      <Card>
        <Title>Most profitable products</Title>
        {topProducts.length === 0 && <Empty text="No sales recorded yet." />}
        {topProducts.map((p, i) => (
          <Row key={i}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{p.name}</Text>
              <Text style={{ color: colors.textMuted }}>{p.units} sold</Text>
            </View>
            <Text style={{ fontWeight: "700", color: colors.success }}>
              {money(p.profit)}
            </Text>
          </Row>
        ))}
      </Card>
    </Screen>
  );
};
