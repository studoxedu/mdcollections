import React from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button } from "../../../src/components/ui";
import { useApp } from "../../../src/context/AppContext";
import { signOutGoogle } from "../../../src/services/googleAuth";
export default () => {
  const r = useRouter(),
    a = useApp();
  const owner = a.user?.role === "OWNER";
  const common = [
    ["Profile", "profile"],
    ["Customers", "customers/index"],
    ["Suppliers", "suppliers/index"],
    ["Expenses", "expenses/index"],
    ["About", "about"],
  ];
  const admin = [
    ["Business", "business"],
    ["Employees", "employees/index"],
    ["Devices", "devices"],
    ["Sync", "sync"],
    ["Backup & restore", "backup"],
    ["Audit log", "audit"],
  ];
  return (
    <Screen title="More">
      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>{a.user?.name}</Text>
        <Text>
          {a.user?.email} · {a.user?.role}
        </Text>
      </Card>
      {owner &&
        admin.map(([n, p]) => (
          <Button
            key={p}
            title={n}
            secondary
            onPress={() => r.push(`/(app)/more/${p}` as any)}
          />
        ))}
      {common.map(([n, p]) => (
        <Button
          key={p}
          title={n}
          secondary
          onPress={() => r.push(`/(app)/more/${p}` as any)}
        />
      ))}
      <Button
        title="Sign out"
        danger
        onPress={async () => {
          if (a.hasGoogleAuth) await signOutGoogle();
          r.replace("/(auth)/login" as any);
        }}
      />
    </Screen>
  );
};
