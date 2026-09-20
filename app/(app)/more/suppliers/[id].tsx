import React from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen, Card, Title } from "../../../../src/components/ui";
import { one, q } from "../../../../src/database/client";
export default () => {
  const { id } = useLocalSearchParams<{ id: string }>(),
    s = one<any>("SELECT * FROM suppliers WHERE id=?", [id]),
    p = q<any>("SELECT * FROM products WHERE supplier_id=?", [id]);
  return (
    <Screen title="Supplier detail">
      <Card>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>{s?.name}</Text>
        <Text>{s?.phone}</Text>
        <Text>{s?.address}</Text>
        <Text>{s?.notes}</Text>
      </Card>
      <Card>
        <Title>Products supplied</Title>
        {p.map((x) => (
          <Text key={x.id}>{x.name}</Text>
        ))}
      </Card>
    </Screen>
  );
};
