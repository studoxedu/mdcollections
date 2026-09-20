import React from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen, Card } from "../../../../src/components/ui";
import { one } from "../../../../src/database/client";
import { money, dateOnly } from "../../../../src/utils/format";
export default () => {
  const { id } = useLocalSearchParams<{ id: string }>(),
    e = one<any>("SELECT * FROM expenses WHERE id=?", [id]);
  return (
    <Screen title="Expense detail">
      <Card>
        <Text style={{ fontSize: 34, fontWeight: "700" }}>
          {money(e?.amount || 0)}
        </Text>
        <Text>{e?.description}</Text>
        <Text>{e?.category}</Text>
        <Text>{e && dateOnly(e.date)}</Text>
        <Text>{e?.note}</Text>
      </Card>
    </Screen>
  );
};
