import { Stack } from "expo-router";
import { AppProvider } from "../src/context/AppContext";
import { StatusBar } from "expo-status-bar";
export default () => (
  <AppProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false }} />
  </AppProvider>
);
