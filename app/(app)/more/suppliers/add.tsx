import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Screen, Field, Button } from "../../../../src/components/ui";
import { createSupplier } from "../../../../src/repositories/core";
export default () => {
  const r = useRouter(),
    [n, setN] = useState(""),
    [p, setP] = useState(""),
    [a, setA] = useState("");
  return (
    <Screen title="Add supplier">
      <Field label="Name" value={n} onChangeText={setN} />
      <Field label="Phone" value={p} onChangeText={setP} />
      <Field label="Address" value={a} onChangeText={setA} />
      <Button
        title="Save supplier"
        onPress={() => {
          createSupplier({ name: n, phone: p, address: a });
          r.back();
        }}
      />
    </Screen>
  );
};
