import React, { useState } from "react";
import { Text, View } from "react-native";
import { Screen, Card, Field, Button } from "../../../src/components/ui";
import { q } from "../../../src/database/client";
import { addCategory } from "../../../src/repositories/core";
export default () => {
  const [n, setN] = useState(""),
    [v, setV] = useState(0);
  const cats = q<any>(
    "SELECT c.*,COUNT(p.id) count FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id",
  );
  return (
    <Screen title="Categories">
      <Card>
        <Field label="New category" value={n} onChangeText={setN} />
        <Button
          title="Add category"
          onPress={() => {
            if (n) {
              addCategory(n);
              setN("");
              setV(v + 1);
            }
          }}
        />
      </Card>
      {cats.map((c) => (
        <Card key={c.id}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontWeight: "700" }}>{c.name}</Text>
            <Text>{c.count} products</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
};
