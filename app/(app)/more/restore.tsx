import React, { useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button } from "../../../src/components/ui";
import { hasGoogleAuth } from "../../../src/services/googleAuth";
import { restoreFromCloud } from "../../../src/services/restore";
import { colors } from "../../../src/constants/theme";

export default () => {
  const r = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const run = async () => {
    setStatus("running");
    setMessage("");
    try {
      const result = await restoreFromCloud();
      setStatus(result.ok ? "done" : "error");
      setMessage(result.message);
      if (result.ok) setTimeout(() => r.replace("/(app)" as any), 800);
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || "Restore failed. Try again.");
    }
  };

  return (
    <Screen title="Restore">
      <Card>
        <Text>
          Restore business data from the cloud after signing in on a new device.
        </Text>
        {!hasGoogleAuth && (
          <Text style={{ marginTop: 10, color: colors.textMuted }}>
            Connect to the internet and try again.
          </Text>
        )}
        {message !== "" && (
          <Text
            style={{
              marginTop: 10,
              color: status === "error" ? colors.danger : colors.success,
            }}
          >
            {message}
          </Text>
        )}
      </Card>
      <Button
        title={status === "running" ? "Restoring…" : "Retry restore"}
        disabled={!hasGoogleAuth || status === "running"}
        onPress={run}
      />
    </Screen>
  );
};
