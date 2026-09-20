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
import { dateTime, dateOnly } from "../../../src/utils/format";
import { colors } from "../../../src/constants/theme";

// Sale-driven stock movements are already covered by the Sales report, so
// this screen focuses on manual/adjustment movements (purchases, returns,
// damaged, missing, corrections) — excluding type='SALE'.
const NON_SALE = "type != 'SALE'";

const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

export default () => {
  const totals = q<any>(
    `SELECT
       COUNT(*) n,
       COALESCE(SUM(CASE WHEN direction='IN' THEN quantity ELSE 0 END),0) inQty,
       COALESCE(SUM(CASE WHEN direction='OUT' THEN quantity ELSE 0 END),0) outQty,
       COALESCE(SUM(CASE WHEN type IN ('MISSING','DAMAGED') THEN quantity ELSE 0 END),0) lossQty
     FROM stock_movements WHERE ${NON_SALE}`,
  )[0];
  const netChange = totals.inQty - totals.outQty;

  const days = last7Days();
  const dailyRows = q<any>(
    `SELECT substr(created_at,1,10) day, COUNT(*) n FROM stock_movements WHERE ${NON_SALE} GROUP BY day`,
  );
  const byDay: Record<string, number> = Object.fromEntries(
    dailyRows.map((r) => [r.day, r.n]),
  );
  const trend = days.map((d) => byDay[d] || 0);
  const maxTrend = Math.max(1, ...trend);

  const recent = q<any>(
    `SELECT m.*, p.name product_name FROM stock_movements m
     JOIN products p ON p.id=m.product_id
     WHERE ${NON_SALE} ORDER BY m.created_at DESC LIMIT 8`,
  );

  return (
    <Screen title="Movements report">
      <Card>
        <Title>This period</Title>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Metric label="Movements" value={totals.n} />
          <Metric label="Stock in" value={totals.inQty} />
          <Metric label="Stock out" value={totals.outQty} />
          <Metric
            label="Net change"
            value={netChange >= 0 ? `+${netChange}` : netChange}
          />
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
                {trend[i]}
              </Text>
            </View>
            <Bar value={trend[i]} max={maxTrend} />
          </View>
        ))}
      </Card>

      <Card>
        <Title>Recent movements</Title>
        {recent.length === 0 && (
          <Empty text="No stock adjustments recorded yet." />
        )}
        {recent.map((x) => (
          <Row key={x.id}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>
                {x.type} · {x.direction === "IN" ? "+" : "-"}
                {x.quantity}
              </Text>
              <Text style={{ color: colors.textMuted }}>
                {x.product_name} · {dateTime(x.created_at)}
              </Text>
            </View>
          </Row>
        ))}
      </Card>
    </Screen>
  );
};
