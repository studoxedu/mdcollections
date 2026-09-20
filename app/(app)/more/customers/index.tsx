import React from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Row, Button } from "../../../../src/components/ui";
import { q } from "../../../../src/database/client";
export default () => {
  const r = useRouter(),
    xs = q<any>("SELECT * FROM customers ORDER BY name");
  return (
    <Screen title="Customers">
      <Button
        title="+ Add customer"
        onPress={() => r.push("/(app)/more/customers/add" as any)}
      />
      {xs.map((x) => (
        <Row
          key={x.id}
          onPress={() => r.push(`/(app)/more/customers/${x.id}` as any)}
        >
          <Text style={{ flex: 1, fontWeight: "700" }}>{x.name}</Text>
          <Text>{x.phone}</Text>
        </Row>
      ))}
    </Screen>
  );
};
