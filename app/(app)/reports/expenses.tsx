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
import { money, dateOnly, dateTime } from "../../../src/utils/format";
import { colors } from "../../../src/constants/theme";

const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

export default () => {
  const totals = q<any>(
    "SELECT COALESCE(SUM(amount),0) total, COUNT(*) n FROM expenses WHERE deleted=0",
  )[0];
  const avgExpense = totals.n > 0 ? totals.total / totals.n : 0;
  const topCategory = q<any>(
    "SELECT category, SUM(amount) v FROM expenses WHERE deleted=0 GROUP BY category ORDER BY v DESC LIMIT 1",
  )[0];

  const days = last7Days();
  const dailyRows = q<any>(
    "SELECT substr(created_at,1,10) day, SUM(amount) v FROM expenses WHERE deleted=0 GROUP BY day",
  );
  const byDay: Record<string, number> = Object.fromEntries(
    dailyRows.map((r) => [r.day, r.v]),
  );
  const trend = days.map((d) => byDay[d] || 0);
  const maxTrend = Math.max(1, ...trend);

  const recent = q<any>(
    "SELECT * FROM expenses WHERE deleted=0 ORDER BY created_at DESC LIMIT 8",
  );

  return (
    <Screen title="Expenses report">
      <Card>
        <Title>This period</Title>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Metric label="Total spent" value={money(totals.total)} />
          <Metric label="Entries" value={totals.n} />
          <Metric label="Avg expense" value={money(avgExpense)} />
          <Metric
            label="Top category"
            value={topCategory ? topCategory.category : "—"}
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
                {money(trend[i])}
              </Text>
            </View>
            <Bar value={trend[i]} max={maxTrend} />
          </View>
        ))}
      </Card>

      <Card>
        <Title>Recent expenses</Title>
        {recent.length === 0 && <Empty text="No expenses recorded yet." />}
        {recent.map((x) => (
          <Row key={x.id}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{x.description}</Text>
              <Text style={{ color: colors.textMuted }}>
                {x.category} · {dateTime(x.created_at)}
              </Text>
            </View>
            <Text style={{ fontWeight: "700" }}>{money(x.amount)}</Text>
          </Row>
        ))}
      </Card>
    </Screen>
  );
};
