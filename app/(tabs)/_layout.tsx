import { Tabs } from "expo-router";
import React from "react";

import { CustomTabBar } from "@/components/ui/custom-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="speaking" />
      <Tabs.Screen name="my-progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
