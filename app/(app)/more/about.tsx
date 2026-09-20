import React from "react";
import { Text } from "react-native";
import { Screen, Card } from "../../../src/components/ui";
export default () => (
  <Screen title="About">
    <Card>
      <Text style={{ fontSize: 28, fontWeight: "700", color: "#000060" }}>
        ShopStock
      </Text>
      <Text>v1.0.0</Text>
      <Text style={{ marginTop: 12 }}>
        Offline-first retail inventory and point-of-sale software for MD
        Collections.
      </Text>
    </Card>
    <Card>
      <Text>
        Help and legal information are available when your business connects its
        support channels.
      </Text>
    </Card>
  </Screen>
);
