import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Screen, Field, Button } from "../../../../src/components/ui";
import { createMember } from "../../../../src/repositories/core";
export default () => {
  const r = useRouter(),
    [n, setN] = useState(""),
    [e, setE] = useState("");
  return (
    <Screen title="Invite employee">
      <Field label="Full name" value={n} onChangeText={setN} />
      <Field label="Email" value={e} onChangeText={setE} />
      <Button
        title="Create member"
        onPress={() => {
          createMember({ full_name: n, email: e, preset: "cashier" });
          r.back();
        }}
      />
    </Screen>
  );
};
