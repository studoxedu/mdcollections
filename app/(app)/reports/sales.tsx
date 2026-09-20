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
    "SELECT COALESCE(SUM(total),0) revenue, COUNT(*) n FROM sales WHERE cancelled=0",
  )[0];
  const itemTotals = q<any>(
    "SELECT COALESCE(SUM(si.quantity),0) units FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.cancelled=0",
  )[0];
  const avgSale = totals.n > 0 ? totals.revenue / totals.n : 0;

  const days = last7Days();
  const dailyRows = q<any>(
    "SELECT substr(created_at,1,10) day, SUM(total) v FROM sales WHERE cancelled=0 GROUP BY day",
  );
  const byDay: Record<string, number> = Object.fromEntries(
    dailyRows.map((r) => [r.day, r.v]),
  );
  const trend = days.map((d) => byDay[d] || 0);
  const maxTrend = Math.max(1, ...trend);

  const topSellers = q<any>(
    `SELECT si.product_name name, SUM(si.quantity) units, SUM(si.line_total) revenue
     FROM sale_items si JOIN sales s ON s.id=si.sale_id
     WHERE s.cancelled=0 GROUP BY si.product_id ORDER BY units DESC LIMIT 6`,
  );

  return (
    <Screen title="Sales report">
      <Card>
        <Title>This period</Title>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Metric label="Revenue" value={money(totals.revenue)} />
          <Metric label="Transactions" value={totals.n} />
          <Metric label="Avg sale" value={money(avgSale)} />
          <Metric label="Items sold" value={itemTotals.units} />
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
            <Bar value={trend[i]} max={maxTrend} />
          </View>
        ))}
      </Card>

      <Card>
        <Title>Top sellers</Title>
        {topSellers.length === 0 && <Empty text="No sales recorded yet." />}
        {topSellers.map((p, i) => (
          <Row key={i}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{p.name}</Text>
              <Text style={{ color: colors.textMuted }}>
                {p.units} sold · {money(p.revenue)}
              </Text>
            </View>
          </Row>
        ))}
      </Card>
    </Screen>
  );
};
