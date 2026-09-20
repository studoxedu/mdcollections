import React, { useState } from "react";
import { Text } from "react-native";
import { Screen, Card, Button } from "../../../src/components/ui";
import { hasGoogleAuth } from "../../../src/services/googleAuth";
import { restoreFromCloud } from "../../../src/services/restore";
import { createSnapshot } from "../../../src/services/snapshot";
import { colors } from "../../../src/constants/theme";

export default () => {
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [message, setMessage] = useState("");

  return (
    <Screen title="Backup & restore">
      <Card>
        <Text style={{ fontWeight: "700" }}>Local data is durable</Text>
        <Text>Sales, stock and audit data live in SQLite on this device.</Text>
        {message !== "" && (
          <Text style={{ marginTop: 10, color: colors.textMuted }}>
            {message}
          </Text>
        )}
      </Card>
      <Button
        title={busy === "backup" ? "Backing up…" : "Create cloud backup"}
        disabled={!hasGoogleAuth || busy !== null}
        onPress={async () => {
          setBusy("backup");
          setMessage("");
          const ok = await createSnapshot().catch(() => false);
          setMessage(ok ? "Backup created." : "Backup failed. Try again.");
          setBusy(null);
        }}
      />
      <Button
        title={busy === "restore" ? "Restoring…" : "Restore from cloud"}
        disabled={!hasGoogleAuth || busy !== null}
        onPress={async () => {
          setBusy("restore");
          setMessage("");
          const result = await restoreFromCloud();
          setMessage(result.message);
          setBusy(null);
        }}
      />
    </Screen>
  );
};
