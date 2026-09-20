import React from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Row, Button } from "../../../../src/components/ui";
import { q } from "../../../../src/database/client";
import { money, dateOnly } from "../../../../src/utils/format";
export default () => {
  const r = useRouter(),
    e = q<any>(
      "SELECT * FROM expenses WHERE deleted=0 ORDER BY created_at DESC",
    );
  return (
    <Screen title="Expenses">
      <Card>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>
          {money(e.reduce((a, x) => a + x.amount, 0))}
        </Text>
        <Text>Total recorded expenses</Text>
      </Card>
      <Button
        title="+ Add expense"
        onPress={() => r.push("/(app)/more/expenses/new" as any)}
      />
      {e.map((x) => (
        <Row
          key={x.id}
          onPress={() => r.push(`/(app)/more/expenses/${x.id}` as any)}
        >
          <Text style={{ flex: 1, fontWeight: "700" }}>
            {x.description}
            {"\n"}
            <Text style={{ fontWeight: "400", color: "#5A6478" }}>
              {x.category} · {dateOnly(x.date)}
            </Text>
          </Text>
          <Text>{money(x.amount)}</Text>
        </Row>
      ))}
    </Screen>
  );
};
