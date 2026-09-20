import React from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen, Card, Title } from "../../../../src/components/ui";
import { one } from "../../../../src/database/client";
import { dateTime } from "../../../../src/utils/format";
export default () => {
  const { id } = useLocalSearchParams<{ id: string }>(),
    m = one<any>(
      "SELECT m.*,p.name FROM stock_movements m LEFT JOIN products p ON p.id=m.product_id WHERE m.id=?",
      [id],
    );
  return (
    <Screen title="Movement detail">
      {m ? (
        <>
          <Card>
            <Title>{m.type}</Title>
            <Text>{m.name}</Text>
            <Text>Quantity: {m.quantity}</Text>
            <Text>
              Stock: {m.previous_stock} → {m.resulting_stock}
            </Text>
          </Card>
          <Card>
            <Title>Recorded by</Title>
            <Text>Person: {m.user_id}</Text>
            <Text>Device: {m.device_id}</Text>
            <Text>Time: {dateTime(m.created_at)}</Text>
            <Text>Reason: {m.reason || "—"}</Text>
            <Text>Note: {m.note || "—"}</Text>
          </Card>
        </>
      ) : (
        <Text>Movement not found.</Text>
      )}
    </Screen>
  );
};
