import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useApp } from "../src/context/AppContext";
import { colors } from "../src/constants/theme";

export default function Index() {
  const a = useApp();
  if (!a.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (a.hasGoogleAuth && !a.signedIn) return <Redirect href="/(auth)/login" />;
  if (a.hasGoogleAuth && a.signedIn && !a.business)
    return <Redirect href={"/(auth)/setup" as any} />;
  return <Redirect href="/(app)" />;
}
