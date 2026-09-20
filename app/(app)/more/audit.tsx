import React from "react";
import { Text } from "react-native";
import { Screen, Row } from "../../../src/components/ui";
import { q } from "../../../src/database/client";
import { dateTime } from "../../../src/utils/format";
export default () => (
  <Screen title="Audit log">
    {q<any>("SELECT * FROM audit_events ORDER BY created_at DESC").map((x) => (
      <Row key={x.id}>
        <Text style={{ flex: 1, fontWeight: "700" }}>
          {x.action}
          {"\n"}
          <Text style={{ fontWeight: "400", color: "#5A6478" }}>
            {x.entity_type} · {dateTime(x.created_at)}
          </Text>
        </Text>
      </Row>
    ))}
  </Screen>
);
