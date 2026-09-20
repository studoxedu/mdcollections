import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Field, Button, Title } from "../../src/components/ui";
import { useApp } from "../../src/context/AppContext";
import {
  createNewBusiness,
  joinExistingBusiness,
} from "../../src/services/businessFolder";
import { colors } from "../../src/constants/theme";

type Mode = "choose" | "create" | "join";

export default function Setup() {
  const r = useRouter(),
    a = useApp(),
    [mode, setMode] = useState<Mode>("choose"),
    [businessName, setBusinessName] = useState(""),
    [folderLink, setFolderLink] = useState(""),
    [busy, setBusy] = useState(false);

  const finish = async () => {
    await a.refreshUser();
    r.replace("/");
  };

  const handleCreate = async () => {
    if (!businessName.trim()) {
      Alert.alert("Business name required", "Give your business a name first.");
      return;
    }
    setBusy(true);
    try {
      await createNewBusiness(businessName.trim());
      await finish();
    } catch (e: any) {
      Alert.alert(
        "Couldn't create the business folder",
        e?.message || "Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!folderLink.trim()) {
      Alert.alert(
        "Folder link required",
        "Paste the link or ID the owner shared.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await joinExistingBusiness(folderLink.trim());
      if (!result.ok) {
        Alert.alert("Couldn't join", result.message);
        return;
      }
      await finish();
    } catch (e: any) {
      Alert.alert("Couldn't join", e?.message || "Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "choose") {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: "700", color: "#000060" }}>
            Set up your business
          </Text>
          <Text style={{ marginTop: 8, color: colors.textMuted }}>
            Signed in as {a.user?.email || "your Google account"}. Everything
            syncs through a folder in this account's Google Drive — no servers,
            no accounts to manage.
          </Text>
          <Card style={{ marginTop: 24 }}>
            <Title>I'm the owner</Title>
            <Text style={{ color: colors.textMuted, marginBottom: 10 }}>
              Creates a new Drive folder for your business. You'll be able to
              share it with staff afterward from Business settings.
            </Text>
            <Button
              title="Create a new business"
              onPress={() => setMode("create")}
            />
          </Card>
          <Card>
            <Title>I'm joining a team</Title>
            <Text style={{ color: colors.textMuted, marginBottom: 10 }}>
              The owner shares a Drive folder with your Google account and sends
              you the link — paste it here.
            </Text>
            <Button
              title="Join an existing business"
              secondary
              onPress={() => setMode("join")}
            />
          </Card>
        </View>
      </Screen>
    );
  }

  if (mode === "create") {
    return (
      <Screen title="Create your business">
        <Card>
          <Field
            label="Business name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. MD Collections"
          />
          <Button
            title={busy ? "Creating…" : "Create"}
            disabled={busy}
            onPress={handleCreate}
          />
          <Button
            title="Back"
            secondary
            disabled={busy}
            onPress={() => setMode("choose")}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Join a business">
      <Card>
        <Field
          label="Folder link or ID"
          value={folderLink}
          onChangeText={setFolderLink}
          placeholder="https://drive.google.com/drive/folders/…"
        />
        <Button
          title={busy ? "Joining…" : "Join"}
          disabled={busy}
          onPress={handleJoin}
        />
        <Button
          title="Back"
          secondary
          disabled={busy}
          onPress={() => setMode("choose")}
        />
      </Card>
    </Screen>
  );
}
