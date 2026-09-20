import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Screen, Field, Button } from "../../../../src/components/ui";
import { createExpense } from "../../../../src/repositories/core";
export default () => {
  const r = useRouter(),
    [d, setD] = useState("Stock delivery"),
    [a, setA] = useState("0"),
    [c, setC] = useState("General"),
    [n, setN] = useState("");
  return (
    <Screen title="Add expense">
      <Field label="Description" value={d} onChangeText={setD} />
      <Field
        label="Amount"
        value={a}
        onChangeText={setA}
        keyboardType="numeric"
      />
      <Field label="Category" value={c} onChangeText={setC} />
      <Field label="Note" value={n} onChangeText={setN} />
      <Button
        title="Save expense"
        onPress={() => {
          createExpense({ description: d, amount: a, category: c, note: n });
          r.back();
        }}
      />
    </Screen>
  );
};
