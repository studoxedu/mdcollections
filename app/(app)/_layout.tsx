import { Tabs } from "expo-router";
import { colors } from "../../src/constants/theme";
export default () => (
  <Tabs
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: "#8A93A6",
      tabBarStyle: { height: 66, paddingBottom: 8 },
      tabBarLabelStyle: { fontSize: 11 },
    }}
  >
    <Tabs.Screen name="index" options={{ title: "Home" }} />
    <Tabs.Screen name="inventory/index" options={{ title: "Inventory" }} />
    <Tabs.Screen
      name="sell/index"
      options={{ title: "Sell", tabBarLabel: "Sell" }}
    />
    <Tabs.Screen name="reports/index" options={{ title: "Reports" }} />
    <Tabs.Screen name="more/index" options={{ title: "More" }} />
  </Tabs>
);
