import React from "react";
import { Alert, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Button } from "../../../src/components/ui";
import { one, q } from "../../../src/database/client";
import { cancelSale } from "../../../src/repositories/core";
import { money, dateTime } from "../../../src/utils/format";
export default () => {
  const { id } = useLocalSearchParams<{ id: string }>(),
    r = useRouter(),
    s = one<any>("SELECT * FROM sales WHERE id=?", [id]),
    items = q<any>("SELECT * FROM sale_items WHERE sale_id=?", [id]);
  if (!s)
    return (
      <Screen title="Sale">
        <Text>Sale not found.</Text>
      </Screen>
    );
  return (
    <Screen title="Sale detail">
      <Card>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          {s.receipt_number}
        </Text>
        <Text>
          {dateTime(s.created_at)} · {s.payment_method}
        </Text>
        {items.map((x) => (
          <Text key={x.id} style={{ marginTop: 10 }}>
            {x.product_name} × {x.quantity} · {money(x.line_total)}
          </Text>
        ))}
        <Text style={{ fontSize: 24, fontWeight: "700", marginTop: 14 }}>
          {money(s.total)}
        </Text>
      </Card>
      {!s.cancelled && (
        <Button
          title="Cancel sale"
          danger
          onPress={() =>
            Alert.alert("Cancel sale", "This restores sold stock.", [
              { text: "Keep" },
              {
                text: "Cancel sale",
                onPress: () => {
                  cancelSale(id);
                  r.back();
                },
              },
            ])
          }
        />
      )}
    </Screen>
  );
};
