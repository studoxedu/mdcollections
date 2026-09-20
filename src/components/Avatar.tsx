import React from "react";
import { Text, View } from "react-native";
export default ({ name }: { name: string }) => (
  <View
    style={{
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#E7EFFE",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Text style={{ color: "#115FE6", fontWeight: "700" }}>
      {name.slice(0, 1)}
    </Text>
  </View>
);
