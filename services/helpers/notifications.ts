import { NativeModules, Platform, PermissionsAndroid } from "react-native";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";

import type { DevicePlatform } from "@/services/api/notifications";

type MessagingModule = typeof import("@react-native-firebase/messaging").default;

let messagingModule: MessagingModule | null | undefined;

const resolveMessaging = (): MessagingModule | null => {
  if (messagingModule !== undefined) return messagingModule;

  try {
    if (!NativeModules.RNFBAppModule || !NativeModules.RNFBMessagingModule) {
      messagingModule = null;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebaseApp = require("@react-native-firebase/app")
      .default as typeof import("@react-native-firebase/app").default;

    if (!firebaseApp.apps?.length) {
      console.warn(
        "[notifications] Firebase app not configured (missing GoogleService-Info.plist?)",
      );
      messagingModule = null;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messaging = require("@react-native-firebase/messaging")
      .default as MessagingModule;

    // Probe native bridge once; cache failure so we never call again.
    messaging().isDeviceRegisteredForRemoteMessages;
    messagingModule = messaging;
    return messaging;
  } catch (error) {
    console.warn("[notifications] Firebase messaging unavailable", error);
    messagingModule = null;
    return null;
  }
};

export const isPushNotificationsAvailable = () => resolveMessaging() !== null;

export const getDevicePlatform = (): DevicePlatform => {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  const messaging = resolveMessaging();
  if (!messaging) return false;

  try {
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
  } catch (error) {
    console.warn("[notifications] permission request failed", error);
    return false;
  }
};

export const getFcmToken = async (): Promise<string | null> => {
  const messaging = resolveMessaging();
  if (!messaging) return null;

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
) => {
  const messaging = resolveMessaging();
  if (!messaging) return () => undefined;
  try {
    return messaging().onMessage(handler);
  } catch (error) {
    console.warn("[notifications] onForegroundMessage failed", error);
    return () => undefined;
  }
};

export const onNotificationOpenedApp = (
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => void,
) => {
  const messaging = resolveMessaging();
  if (!messaging) return () => undefined;
  try {
    return messaging().onNotificationOpenedApp(handler);
  } catch (error) {
    console.warn("[notifications] onNotificationOpenedApp failed", error);
    return () => undefined;
  }
};

export const getInitialNotification = async () => {
  const messaging = resolveMessaging();
  if (!messaging) return null;
  try {
    return await messaging().getInitialNotification();
  } catch (error) {
    console.warn("[notifications] getInitialNotification failed", error);
    return null;
  }
};

export const onTokenRefresh = (handler: (token: string) => void) => {
  const messaging = resolveMessaging();
  if (!messaging) return () => undefined;
  try {
    return messaging().onTokenRefresh(handler);
  } catch (error) {
    console.warn("[notifications] onTokenRefresh failed", error);
    return () => undefined;
  }
};
