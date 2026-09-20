import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button } from "../../src/components/ui";
import { useApp } from "../../src/context/AppContext";
import { signInWithGoogle } from "../../src/services/googleAuth";
import { colors } from "../../src/constants/theme";

export default function Login() {
  const r = useRouter(),
    a = useApp(),
    [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (!a.hasGoogleAuth) {
      r.replace("/(app)");
      return;
    }
    setBusy(true);
    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser) {
        Alert.alert("Sign in cancelled", "Try again when you're ready.");
        return;
      }
      await a.refreshUser();
      r.replace("/");
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 32, fontWeight: "700", color: "#000060" }}>
          MD Collections
        </Text>
        <Text style={{ marginTop: 5, color: colors.textSoft }}>
          ShopStock · Retail · Fashion & Accessories
        </Text>
        <Card style={{ marginTop: 24 }}>
          {!a.hasGoogleAuth && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                marginBottom: 15,
              }}
            >
              Running in offline mode — Google sign-in isn't configured on this
              build.
            </Text>
          )}
          {a.hasGoogleAuth && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 13,
                marginBottom: 15,
              }}
            >
              Sign in with the Google account the business owner shared the
              ShopStock folder with.
            </Text>
          )}
          <Button
            title={
              busy
                ? "Signing in…"
                : a.hasGoogleAuth
                  ? "Sign in with Google"
                  : "Continue offline"
            }
            disabled={busy}
            onPress={handleSignIn}
          />
        </Card>
        <Text
          style={{ textAlign: "center", color: colors.textSoft, marginTop: 20 }}
        >
          ShopStock · v1.0.0
        </Text>
      </View>
    </Screen>
  );
}
