import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Screen, Field, Button } from "../../../../src/components/ui";
import { createCustomer } from "../../../../src/repositories/core";
export default () => {
  const r = useRouter(),
    [n, setN] = useState(""),
    [p, setP] = useState(""),
    [notes, setNotes] = useState("");
  return (
    <Screen title="Add customer">
      <Field label="Name" value={n} onChangeText={setN} />
      <Field
        label="Phone"
        value={p}
        onChangeText={setP}
        keyboardType="phone-pad"
      />
      <Field label="Notes" value={notes} onChangeText={setNotes} />
      <Button
        title="Save customer"
        onPress={() => {
          createCustomer({ name: n, phone: p, notes });
          r.back();
        }}
      />
    </Screen>
  );
};
