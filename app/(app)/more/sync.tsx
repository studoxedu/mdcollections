import React from "react";
import { Text } from "react-native";
import { Screen, Card, Button } from "../../../src/components/ui";
import { pendingEvents } from "../../../src/sync/outbox";
import { runSync } from "../../../src/sync/engine";
import { hasGoogleAuth } from "../../../src/services/googleAuth";
import { q } from "../../../src/database/client";
import { colors } from "../../../src/constants/theme";

export default () => {
  const state = q<any>("SELECT * FROM sync_state WHERE id=1")[0];
  const pendingCount = pendingEvents().length;
  return (
    <Screen title="Sync status">
      <Card>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          {pendingCount ? `${pendingCount} pending` : "Synced"}
        </Text>
        <Text style={{ color: colors.textMuted }}>
          {hasGoogleAuth
            ? "Google Drive sync enabled"
            : "Running locally — Google sign-in isn't configured on this build."}
        </Text>
        {hasGoogleAuth && state?.last_successful_sync_at && (
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>
            Last synced{" "}
            {new Date(state.last_successful_sync_at).toLocaleString()}
          </Text>
        )}
      </Card>
      <Button
        title="Sync now"
        disabled={!hasGoogleAuth}
        onPress={() => void runSync()}
      />
    </Screen>
  );
};
