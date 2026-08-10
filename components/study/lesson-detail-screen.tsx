import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button as ButtonSystem } from "@/components/ui/button-system";
import { LessonContent } from "@/components/study/lesson-detail/lesson-content";
import { LessonPdf } from "@/components/study/lesson-detail/lesson-pdf";
import { LessonVideo } from "@/components/study/lesson-detail/lesson-video";
import { studyApi } from "@/services/api/study";
import { Colors } from "@/services/constant";
import {
  findLessonPdfUrl,
  getLessonTypeLabel,
} from "@/services/helpers/study";
import type { LessonDetailParams } from "@/services/helpers/lesson-navigation";
import type { LessonDetail } from "@/types/study";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

type LessonDetailScreenProps = {
  params: LessonDetailParams;
  onCompleted?: () => Promise<void>;
};

const VIDEO_TYPE_IDS = new Set([1, 2, 3]);
const PDF_TYPE_IDS = new Set([1, 4]);

export function LessonDetailScreen({ params, onCompleted }: LessonDetailScreenProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isDone, setIsDone] = useState(params.isDone === "1");
  const startTimeRef = useRef(Date.now());

  const lessonId = params.contentRefId;
  const studentStudyItemId = params.studentStudyItemId;
  const weekNumber = params.weekNumber || "--";

  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    startTimeRef.current = Date.now();
    setLoading(true);
    studyApi
      .getLessonDetail(lessonId)
      .then((data) => {
        if (!cancelled) setDetail(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const lessonType = detail?.type;
  const itemType = params.itemType;
  const typeLabel = useMemo(
    () => getLessonTypeLabel(lessonType, itemType),
    [lessonType, itemType],
  );
  const pdfUrl = useMemo(() => findLessonPdfUrl(detail), [detail]);
  const showVideo = !!detail?.video && (lessonType ? VIDEO_TYPE_IDS.has(lessonType) : true);
  const showPdf = !!pdfUrl && (lessonType ? PDF_TYPE_IDS.has(lessonType) : true);
  const title = detail?.title ?? params.title ?? "Bài học";
  const icon = iconForType(typeLabel, itemType);
  const canMarkComplete = !isDone && !!studentStudyItemId;

  const handleComplete = async () => {
    if (!studentStudyItemId || completing) return;
    const secondsCompleted = Math.max(
      1,
      Math.round((Date.now() - startTimeRef.current) / 1000),
    );
    const startedAt = new Date(startTimeRef.current)
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z");
    setCompleting(true);
    try {
      await studyApi.completeStudyItem(studentStudyItemId, {
        completed_duration: secondsCompleted,
        started_at: startedAt,
      });
      setIsDone(true);
      await onCompleted?.();
      Alert.alert("Thành công", "Hoàn thành bài học.");
      router.back();
    } catch {
      Alert.alert("Có lỗi xảy ra", "Vui lòng thử lại sau.");
    } finally {
      setCompleting(false);
    }
  };

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
            <Text className="flex-1 text-t2-bold text-dark-75" numberOfLines={1}>
              Quay lại tuần {weekNumber}
            </Text>
          </View>
        </View>

        <ScrollView
          className="mt-4 flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 16 }}
        >
          <View className="flex-row items-start gap-2">
            <View className="h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-primary-01">
              <MaterialIcons name={icon} size={14} color={Colors.primary["01"]} />
            </View>
            <Text className="flex-1 text-t2-bold text-dark-75">
              <Text className="font-normal">{typeLabel}: </Text>
              {title}
            </Text>
          </View>

          {loading ? (
            <View className="aspect-video items-center justify-center rounded-lg bg-neutral-07">
              <ActivityIndicator color={Colors.primary["01"]} size="large" />
            </View>
          ) : !detail ? (
            <View className="aspect-video items-center justify-center rounded-lg bg-neutral-07">
              <Text className="text-t3 text-dark-50">Không tải được nội dung bài học.</Text>
            </View>
          ) : (
            <>
              {showPdf && pdfUrl ? <LessonPdf file={pdfUrl} /> : null}
              {showVideo && detail.video ? (
                <LessonVideo src={detail.video} videoType={detail.video_type} />
              ) : null}
              {detail.content ? <LessonContent content={detail.content} /> : null}
            </>
          )}
        </ScrollView>

        {canMarkComplete ? (
          <View className="border-t border-neutral-06 bg-white px-4 py-4">
            <ButtonSystem
              className="self-center"
              icon={
                <MaterialIcons
                  name="check-circle-outline"
                  size={18}
                  color={Colors.secondary["01"]}
                />
              }
              isLoading={completing}
              onPress={handleComplete}
              size="md"
              variant="tertiary-default"
            >
              Hoàn thành
            </ButtonSystem>
          </View>
        ) : isDone ? (
          <View className="border-t border-neutral-06 bg-white px-4 py-4">
            <View className="flex-row items-center justify-center gap-2">
              <MaterialIcons name="check-circle" size={18} color={Colors.secondary["01"]} />
              <Text className="text-t3-bold text-secondary-01">Đã hoàn thành</Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function iconForType(typeLabel: string, itemType?: string): MaterialIconName {
  if (typeLabel === "Video" || itemType === "video") return "play-circle-outline";
  if (typeLabel === "Tài liệu" || itemType === "document") return "article";
  return "menu-book";
}
