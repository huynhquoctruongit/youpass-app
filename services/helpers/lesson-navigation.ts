import type { Router } from "expo-router";
import type { StudentStudyItem, StudyClassMeta } from "@/types/study";

export type LessonDetailParams = {
  contentRefId: string;
  studentStudyItemId: string;
  title: string;
  itemType: string;
  type: string;
  classId: string;
  courseId: string;
  sectionId: string;
  isDone: string;
  answerId: string;
};

export function studentStudyItemFromLessonParams(
  params: LessonDetailParams,
): StudentStudyItem {
  const answerId = params.answerId || undefined;
  return {
    id: params.studentStudyItemId,
    status: params.isDone === "1" ? "completed" : "not_started",
    study_item: {
      content_ref_id: params.contentRefId,
      item_type: params.itemType || undefined,
      type: params.type ? Number(params.type) : undefined,
      title: params.title || undefined,
    },
    answer_data: answerId ? [{ id: answerId }] : undefined,
  };
}

export function classMetaFromLessonParams(params: LessonDetailParams): StudyClassMeta | undefined {
  if (!params.classId && !params.courseId && !params.sectionId) return undefined;
  return {
    class_id: params.classId || undefined,
    course_id: params.courseId || undefined,
    section_id: params.sectionId || undefined,
  };
}

export function buildLessonDetailParams(
  task: StudentStudyItem,
  classMeta?: StudyClassMeta,
): LessonDetailParams | null {
  const studyItem = task.study_item;
  if (!studyItem?.content_ref_id || !task.id) return null;

  return {
    contentRefId: String(studyItem.content_ref_id),
    studentStudyItemId: task.id,
    title: studyItem.title ?? "Bài học",
    itemType: studyItem.item_type ?? "",
    type: String(studyItem.type ?? ""),
    classId: classMeta?.class_id != null ? String(classMeta.class_id) : "",
    courseId: classMeta?.course_id != null ? String(classMeta.course_id) : "",
    sectionId: classMeta?.section_id != null ? String(classMeta.section_id) : "",
    isDone: task.status === "completed" ? "1" : "0",
    answerId: task.answer_data?.[0]?.id != null ? String(task.answer_data[0].id) : "",
  };
}

export function navigateToLessonDetail(
  router: Router,
  task: StudentStudyItem,
  classMeta?: StudyClassMeta,
): boolean {
  const params = buildLessonDetailParams(task, classMeta);
  if (!params) return false;

  router.push({
    pathname: "/lesson-detail/[contentRefId]",
    params,
  });
  return true;
}
