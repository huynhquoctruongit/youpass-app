import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button as ButtonSystem } from "@/components/ui/button-system";
import { studyApi } from "@/services/api/study";
import { Colors } from "@/services/constant";
import { buildStudyItemUrl, ITEM_TYPE_LABELS } from "@/services/helpers/study";
import {
  classMetaFromLessonParams,
  studentStudyItemFromLessonParams,
  type LessonDetailParams,
} from "@/services/helpers/lesson-navigation";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

type LessonDetailScreenProps = {
  params: LessonDetailParams;
  onCompleted?: () => Promise<void>;
};

export function LessonDetailScreen({ params, onCompleted }: LessonDetailScreenProps) {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [completing, setCompleting] = useState(false);
  const startTimeRef = useRef(Date.now());

  const task = studentStudyItemFromLessonParams(params);
  const classMeta = classMetaFromLessonParams(params);
  const studyItem = task.study_item;
  const itemType = studyItem?.item_type;
  const typeLabel = ITEM_TYPE_LABELS[itemType ?? ""] ?? "Bài học";
  const title = studyItem?.title ?? params.title ?? "Bài học";
  const url = buildStudyItemUrl(task, classMeta, params.isDone === "1");
  const canMarkComplete = itemType === "document" && params.isDone !== "1";
  const weekNumber = params.weekNumber || "--";

  useEffect(() => {
    startTimeRef.current = Date.now();
    let cancelled = false;

    SecureStore.getItemAsync("auth_token")
      .then((token) => {
        if (!cancelled) setAuthToken(token);
      })
      .finally(() => {
        if (!cancelled) setLoadingToken(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.studentStudyItemId]);

  const handleComplete = async () => {
    if (!task.id || completing) return;

    const secondsCompleted = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const startedAt = new Date(startTimeRef.current).toISOString().replace(/\.\d{3}Z$/, "Z");

    setCompleting(true);
    try {
      await studyApi.completeStudyItem(task.id, {
        completed_duration: secondsCompleted,
        started_at: startedAt,
      });
      await onCompleted?.();
      router.back();
      Alert.alert("Thành công", "Hoàn thành bài học.");
    } catch {
      Alert.alert("Có lỗi xảy ra", "Vui lòng thử lại sau.");
    } finally {
      setCompleting(false);
    }
  };

  console.log(task);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-1 bg-white-03">
        <View className="gap-2 px-4 pt-4">
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="Quay lại"
              className="h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={16} color={Colors.dark["75"]} />
            </Pressable>
            <Text className="flex-1 text-t2-bold text-dark-75">
              Quay lại tuần {weekNumber}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-1 gap-4 px-4">
          <View className="flex-row items-start gap-2">
            <View className="h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-primary-01">
              <MaterialIcons
                name={iconForItemType(itemType)}
                size={14}
                color={Colors.primary["01"]}
              />
            </View>
            <Text className="flex-1 text-t2-bold text-dark-75">
              <Text className="font-normal">{typeLabel}: </Text>
              {title}
            </Text>
          </View>

          <View className="flex-1 overflow-hidden rounded-lg border border-neutral-06 bg-neutral-07">
            {loadingToken || !url ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={Colors.primary["01"]} size="large" />
              </View>
            ) : (
              // <WebView
              //   key={`${task.id}-${url}`}
              //   source={{
              //     uri: url,
              //     headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
              //   }}
              //   startInLoadingState
              //   renderLoading={() => (
              //     <View className="absolute inset-0 items-center justify-center bg-white">
              //       <ActivityIndicator color={Colors.primary["01"]} size="large" />
              //     </View>
              //   )}
              //   className="flex-1"
              // />
              ""
            )}
          </View>
        </View>

        {canMarkComplete ? (
          <View className="border-t border-neutral-06 px-4 py-4">
            <ButtonSystem
              className="self-end"
              icon={<MaterialIcons name="check-circle-outline" size={18} color={Colors.secondary["01"]} />}
              isLoading={completing}
              onPress={handleComplete}
              size="md"
              variant="tertiary-default"
            >
              Hoàn thành
            </ButtonSystem>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function iconForItemType(itemType?: string): MaterialIconName {
  if (itemType === "document") return "article";
  if (itemType === "video") return "play-circle-outline";
  return "menu-book";
}
