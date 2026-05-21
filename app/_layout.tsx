import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from "react";
import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/contexts/auth-context";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import "@/services/helpers/notifications-background";

export const unstable_settings = {
  anchor: "(tabs)",
};

function NavigationGuard() {
  const { isLogin, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isLogin && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isLogin && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLogin, isLoading, segments]);

  return null;
}

function PushNotificationsBridge() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NavigationGuard />
        <PushNotificationsBridge />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
