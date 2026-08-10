import { Platform, PermissionsAndroid } from "react-native";
import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";

import type { DevicePlatform } from "@/services/api/notifications";

export const getDevicePlatform = (): DevicePlatform => {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

export const getFcmToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "ios") {
      await messaging().registerDeviceForRemoteMessages();
    }
    const token = await messaging().getToken();
    return token ?? null;
  } catch (error) {
    console.warn("[notifications] Unable to get FCM token", error);
    return null;
  }
};

export const onForegroundMessage = (
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => void,
) => messaging().onMessage(handler);

export const onNotificationOpenedApp = (
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => void,
) => messaging().onNotificationOpenedApp(handler);

export const getInitialNotification = () =>
  messaging().getInitialNotification();

export const onTokenRefresh = (handler: (token: string) => void) =>
  messaging().onTokenRefresh(handler);
