import messaging from "@react-native-firebase/messaging";

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log(
    "[notifications] background message received",
    remoteMessage?.messageId,
  );
});
