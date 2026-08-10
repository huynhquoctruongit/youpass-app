import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#F97316";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_CONFIG: Record<
  string,
  { label: string; icon: IoniconsName; iconActive: IoniconsName }
> = {
  index: { label: "Trang chủ", icon: "home-outline", iconActive: "home" },
  explore: { label: "Từ vựng", icon: "book-outline", iconActive: "book" },
  "my-progress": { label: "Tiến độ", icon: "bar-chart-outline", iconActive: "bar-chart" },
  profile: { label: "Cá nhân", icon: "person-outline", iconActive: "person" },
};

function TabItem({
  route,
  isActive,
  onPress,
  onLongPress,
}: {
  route: { name: string; key: string };
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const config = TAB_CONFIG[route.name] ?? {
    label: route.name,
    icon: "ellipse-outline" as IoniconsName,
    iconActive: "ellipse" as IoniconsName,
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      android_ripple={null}
    >
      <View style={styles.pill}>
        <Ionicons
          name={isActive ? config.iconActive : config.icon}
          size={22}
          color={isActive ? PRIMARY : "#9CA3AF"}
        />
        {isActive && (
          <Text style={styles.label} numberOfLines={1}>
            {config.label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
          return (
            <TabItem
              key={route.key}
              route={route}
              isActive={isActive}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillActive: {},
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: PRIMARY,
    marginTop: 2,
  },
});
