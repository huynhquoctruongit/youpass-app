import { NativeModules } from "react-native";

/**
 * Background FCM handler must be registered at module load time.
 * Guard every step — missing GoogleService-Info.plist / unconfigured Firebase
 * must not crash app boot.
 */
function registerBackgroundHandler() {
  try {
    if (!NativeModules.RNFBAppModule || !NativeModules.RNFBMessagingModule) {
      console.warn(
        "[notifications] Firebase native module unavailable; background handler skipped",
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebaseApp = require("@react-native-firebase/app")
      .default as typeof import("@react-native-firebase/app").default;

    if (!firebaseApp.apps?.length) {
      console.warn(
        "[notifications] Firebase app not configured (missing GoogleService-Info.plist?); background handler skipped",
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messaging = require("@react-native-firebase/messaging")
      .default as typeof import("@react-native-firebase/messaging").default;

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log(
        "[notifications] background message received",
        remoteMessage?.messageId,
      );
    });
  } catch (error) {
    console.warn("[notifications] background handler skipped", error);
  }
}

registerBackgroundHandler();
