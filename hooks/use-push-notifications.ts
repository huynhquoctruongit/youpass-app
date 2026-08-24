import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";

import { useAuth } from "@/hooks/use-auth";
import { notificationsApi } from "@/services/api/notifications";
import {
  getDevicePlatform,
  getFcmToken,
  getInitialNotification,
  isPushNotificationsAvailable,
  onForegroundMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestNotificationPermission,
} from "@/services/helpers/notifications";

type NotificationHandler = (
  message: FirebaseMessagingTypes.RemoteMessage,
) => void;

interface UsePushNotificationsOptions {
  onForeground?: NotificationHandler;
  onOpened?: NotificationHandler;
}

const defaultForegroundHandler: NotificationHandler = (message) => {
  const title = message.notification?.title ?? "Thông báo";
  const body = message.notification?.body ?? "";
  if (body) Alert.alert(title, body);
};

export const usePushNotifications = ({
  onForeground = defaultForegroundHandler,
  onOpened,
}: UsePushNotificationsOptions = {}) => {
  const { isLogin } = useAuth();
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLogin || !isPushNotificationsAvailable()) return;

    let isMounted = true;

    const register = async () => {
      try {
        const granted = await requestNotificationPermission();
        if (!granted) return;

        const token = await getFcmToken();
        if (!token || !isMounted) return;
        if (registeredTokenRef.current === token) return;

        const MAX_RETRIES = 5;
        const RETRY_DELAY_MS = 30_000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          if (!isMounted) return;
          try {
            await notificationsApi.registerDeviceToken({
              token,
              platform: getDevicePlatform(),
            });
            registeredTokenRef.current = token;
            return;
          } catch (error) {
            console.warn(
              `[notifications] register attempt ${attempt}/${MAX_RETRIES} failed`,
              error,
            );
            if (attempt < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            }
          }
        }
      } catch (error) {
        console.warn("[notifications] register skipped", error);
      }
    };

    register();

    const unsubscribeRefresh = onTokenRefresh(async (token) => {
      if (registeredTokenRef.current === token) return;
      try {
        await notificationsApi.registerDeviceToken({
          token,
          platform: getDevicePlatform(),
        });
        registeredTokenRef.current = token;
      } catch (error) {
        console.warn("[notifications] refresh device token failed", error);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeRefresh();
    };
  }, [isLogin]);

  useEffect(() => {
    if (!isPushNotificationsAvailable()) return;

    const unsubscribeForeground = onForegroundMessage((message) => {
      onForeground(message);
    });

    const unsubscribeOpened = onNotificationOpenedApp((message) => {
      onOpened?.(message);
    });

    getInitialNotification().then((message) => {
      if (message) onOpened?.(message);
    });

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [onForeground, onOpened]);
};
