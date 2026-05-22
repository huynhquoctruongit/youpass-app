import { useLocalSearchParams } from "expo-router";
import { LessonDetailScreen } from "@/components/study/lesson-detail-screen";
import type { LessonDetailParams } from "@/services/helpers/lesson-navigation";

export default function LessonDetailRoute() {
  const raw = useLocalSearchParams<LessonDetailParams>();

  const params: LessonDetailParams = {
    contentRefId: String(raw.contentRefId ?? ""),
    studentStudyItemId: String(raw.studentStudyItemId ?? ""),
    title: String(raw.title ?? ""),
    itemType: String(raw.itemType ?? ""),
    type: String(raw.type ?? ""),
    classId: String(raw.classId ?? ""),
    courseId: String(raw.courseId ?? ""),
    sectionId: String(raw.sectionId ?? ""),
    isDone: String(raw.isDone ?? ""),
    answerId: String(raw.answerId ?? ""),
    weekNumber: String(raw.weekNumber ?? ""),
  };

  return <LessonDetailScreen params={params} />;
}
