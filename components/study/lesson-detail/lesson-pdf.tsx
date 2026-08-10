import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";
import { Colors } from "@/services/constant";

type LessonPdfProps = {
  file: string;
};

const buildGoogleViewer = (file: string) =>
  `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(file)}`;

export function LessonPdf({ file }: LessonPdfProps) {
  const [open, setOpen] = useState(false);
  const viewerUrl = useMemo(() => buildGoogleViewer(file), [file]);

  return (
    <>
      <View className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-07">
        <View pointerEvents="none" className="absolute inset-0">
          <WebView
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            source={{ uri: viewerUrl }}
            startInLoadingState
            renderLoading={() => (
              <View className="absolute inset-0 items-center justify-center bg-neutral-07">
                <ActivityIndicator color={Colors.primary["01"]} size="large" />
              </View>
            )}
          />
        </View>
        <View className="absolute inset-0 bg-black/40" />
        <Pressable
          accessibilityLabel="Xem chi tiết tài liệu"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-row items-center gap-2 rounded-full bg-secondary-01 px-4 py-2 shadow-md"
          onPress={() => setOpen(true)}
        >
          <MaterialIcons name="picture-as-pdf" size={18} color="#FFFFFF" />
          <Text className="text-t3-bold text-white">Xem chi tiết tài liệu</Text>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        visible={open}
        onRequestClose={() => setOpen(false)}
        presentationStyle="fullScreen"
      >
        <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
          <View className="flex-row items-center gap-2 border-b border-neutral-06 px-4 py-3">
            <Pressable
              accessibilityLabel="Đóng"
              className="h-9 w-9 items-center justify-center rounded-full bg-neutral-07"
              onPress={() => setOpen(false)}
            >
              <MaterialIcons name="close" size={20} color={Colors.dark["75"]} />
            </Pressable>
            <Text className="flex-1 text-t2-bold text-dark-75">Tài liệu</Text>
          </View>
          <View className="flex-1">
            <WebView
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              source={{ uri: viewerUrl }}
              startInLoadingState
              renderLoading={() => (
                <View className="absolute inset-0 items-center justify-center bg-white">
                  <ActivityIndicator color={Colors.primary["01"]} size="large" />
                </View>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
