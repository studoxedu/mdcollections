import React from "react";
import { Text } from "react-native";
export default ({ name, size = 20 }: { name: string; size?: number }) => (
  <Text style={{ fontSize: size }}>
    {(
      {
        plus: "+",
        search: "⌕",
        back: "‹",
        more: "⋯",
        check: "✓",
        close: "×",
        cart: "□",
        home: "⌂",
        box: "□",
        report: "▥",
        menu: "☰",
      } as any
    )[name] || "•"}
  </Text>
);
