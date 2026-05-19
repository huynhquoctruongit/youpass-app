import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";

import { useAuth } from "@/hooks/use-auth";
import { notificationsApi } from "@/services/api/notifications";
import {
  getDevicePlatform,
  getFcmToken,
  getInitialNotification,
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
    if (!isLogin) return;

    let isMounted = true;

    const register = async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      const token = await getFcmToken();
      if (!token || !isMounted) return;
      if (registeredTokenRef.current === token) return;

      try {
        await notificationsApi.registerDeviceToken({
          token,
          platform: getDevicePlatform(),
        });
        registeredTokenRef.current = token;
      } catch (error) {
        console.warn("[notifications] register device token failed", error);
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
