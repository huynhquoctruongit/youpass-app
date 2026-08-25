import "react-native-gesture-handler";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Audio, InterruptionModeIOS } from "expo-av";
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

  // Cấu hình audio toàn cục 1 lần: đảm bảo phát tiếng cả khi máy bật im lặng
  // (iOS) và không bị các lần setAudioMode khác reset về mặc định.
  useEffect(() => {
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => undefined);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NavigationGuard />
        <PushNotificationsBridge />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="lesson-detail/[contentRefId]" options={{ headerShown: false }} />
          <Stack.Screen name="speaking-practice/[part]/[quizId]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
