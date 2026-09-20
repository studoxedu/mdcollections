import React, { useState } from "react";
import { Alert, Text } from "react-native";
import { Screen, Card, Field, Button, Title } from "../../../src/components/ui";
import { q, run } from "../../../src/database/client";
import { hasGoogleAuth } from "../../../src/services/googleAuth";
import {
  getCachedBusinessFolderId,
  shareBusinessWithEmployee,
} from "../../../src/services/businessFolder";
import { addEvent } from "../../../src/sync/outbox";
import {
  getCurrentUserId,
  getCurrentDeviceId,
} from "../../../src/services/session";
import { colors } from "../../../src/constants/theme";

export default () => {
  const b = q<any>("SELECT * FROM business LIMIT 1")[0],
    [n, setN] = useState(b?.name || ""),
    [currency, setCurrency] = useState(b?.currency || "NGN"),
    [email, setEmail] = useState(""),
    [sharing, setSharing] = useState(false);

  const folderId = getCachedBusinessFolderId();

  return (
    <Screen title="Business settings">
      <Field label="Business name" value={n} onChangeText={setN} />
      <Field label="Currency" value={currency} onChangeText={setCurrency} />
      <Button
        title="Save settings"
        onPress={() => {
          const t = new Date().toISOString();
          run("UPDATE business SET name=?,currency=?,updated_at=? WHERE id=?", [
            n,
            currency,
            t,
            b.id,
          ]);
          addEvent({
            business_id: b.id,
            device_id: getCurrentDeviceId(),
            user_id: getCurrentUserId(),
            event_type: "SETTINGS_CHANGED",
            entity_id: b.id,
            payload: { name: n, currency },
          });
        }}
      />

      {hasGoogleAuth && folderId && (
        <Card>
          <Title>Team access</Title>
          <Text style={{ color: colors.textMuted, marginBottom: 10 }}>
            Share the business folder with an employee's Google account so their
            phone can sync. They'll still need to open the app and paste the
            folder link once to join.
          </Text>
          <Field
            label="Employee's Google email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <Button
            title={sharing ? "Sharing…" : "Share folder"}
            disabled={sharing || !email}
            onPress={async () => {
              setSharing(true);
              try {
                await shareBusinessWithEmployee(email);
                Alert.alert(
                  "Shared",
                  `${email} now has access to the business folder.`,
                );
                setEmail("");
              } catch (e: any) {
                Alert.alert("Couldn't share", e?.message || "Try again.");
              } finally {
                setSharing(false);
              }
            }}
          />
        </Card>
      )}
    </Screen>
  );
};
