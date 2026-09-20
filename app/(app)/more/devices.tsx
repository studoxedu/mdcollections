import React, { useState } from "react";
import { Alert, Text } from "react-native";
import { Screen, Card, Button } from "../../../src/components/ui";
import { q } from "../../../src/database/client";
import { revokeDevice } from "../../../src/services/device";
import { getDeviceId } from "../../../src/services/auth";
import { hasGoogleAuth } from "../../../src/services/googleAuth";
import { colors } from "../../../src/constants/theme";

export default () => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [thisDeviceId, setThisDeviceId] = useState<string | null>(null);
  React.useEffect(() => {
    getDeviceId().then(setThisDeviceId);
  }, []);

  const devices = q<any>("SELECT * FROM devices ORDER BY last_seen DESC");

  const confirmRevoke = (d: any) =>
    Alert.alert(
      `Revoke ${d.name}?`,
      "This flips a flag that well-behaved copies of the app respect on their next sync — it isn't unbreakable. To actually cut a device off, remove that person's access to the business folder in Google Drive.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            setBusyId(d.id);
            try {
              await revokeDevice(d.id);
            } catch (e: any) {
              Alert.alert("Couldn't revoke", e?.message || "Try again.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );

  return (
    <Screen title="Devices">
      {!hasGoogleAuth && (
        <Card>
          <Text>
            Running in offline demo mode — device tracking activates once Google
            Drive sync is configured.
          </Text>
        </Card>
      )}
      {devices.length === 0 && hasGoogleAuth && (
        <Card>
          <Text>No devices have synced yet.</Text>
        </Card>
      )}
      {devices.map((d) => (
        <Card key={d.id}>
          <Text style={{ fontWeight: "700" }}>
            {d.name}
            {d.id === thisDeviceId ? " (this device)" : ""}
          </Text>
          <Text style={{ color: colors.textMuted }}>
            {d.platform} · {d.revoked ? "Revoked" : "Active"}
          </Text>
          {!d.revoked && d.id !== thisDeviceId && (
            <Button
              title={busyId === d.id ? "Revoking…" : "Revoke"}
              danger
              disabled={busyId === d.id}
              onPress={() => confirmRevoke(d)}
            />
          )}
        </Card>
      ))}
    </Screen>
  );
};
