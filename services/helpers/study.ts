import type {
  StudentStudyItem,
  StudentStudyWeek,
  StudyClassMeta,
  WeekReflectionFormData,
} from "@/types/study";

export const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const DEFAULT_WEEK_REFLECTION_DATA: WeekReflectionFormData = {
  mood: null,
  challenges: [],
  note: "",
};

export const MOOD_OPTIONS = [
  { value: "great", label: "Rất tốt", emoji: "😘" },
  { value: "satisfied", label: "Hài lòng", emoji: "🥰" },
  { value: "neutral", label: "Bình thường", emoji: "😐" },
  { value: "struggling", label: "Khó khăn", emoji: "😢" },
] as const;

export const CHALLENGES_OPTIONS = [
  { value: "time", label: "Thời gian" },
  { value: "motivation", label: "Động lực" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
] as const;

export const ITEM_TYPE_LABELS: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  text: "Text",
  quiz: "Bài tập",
  homework: "Homework",
  practice: "Luyện tập",
  exercise: "Bài tập",
  document: "Tài liệu",
  vocab: "Vocabulary",
  interactive: "Bài học",
  lesson: "Bài học",
};

export const SKILL_TYPE_LABELS: Record<number, string> = {
  1: "Reading",
  2: "Listening",
  3: "Writing",
  4: "Speaking",
  7: "Writing",
  8: "Speaking",
  9: "Reading",
  10: "Listening",
  11: "Vocabulary",
};

export const QUIZ_TYPE_IDS = [1, 2, 3, 4, 9, 10];

const APP_DOMAIN = process.env.EXPO_PUBLIC_YOUPASS_DOMAIN || "https://youpass.vn";
const ELEARNING_DOMAIN = process.env.EXPO_PUBLIC_ELEARNING_DOMAIN || "https://elearning.youpass.vn";

export const formatDate = (value?: string | Date, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", options ?? { day: "2-digit", month: "2-digit" }).format(date);
};

export const formatDateTime = (value?: string) => {
  if (!value) return "--";
  return formatDate(value, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
};

export const toDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isDateBetween = (dateValue: string | Date, startValue?: string, endValue?: string) => {
  if (!startValue || !endValue) return false;
  const date = startOfDay(dateValue).getTime();
  return date >= startOfDay(startValue).getTime() && date <= startOfDay(endValue).getTime();
};

export const isFutureDate = (dateValue?: string) => {
  if (!dateValue) return false;
  return startOfDay(dateValue).getTime() > startOfDay(new Date()).getTime();
};

export const convertMinsToHrsMins = (minutes?: number) => {
  if (minutes == null) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
};

export const getBandScore = (value?: number | string) => {
  if (value == null || value === "") return "--";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${value}`;
  if (numeric > 9) return `${Math.round(numeric) / 10}`;
  return `${numeric}`;
};

export const findStudyWeekForToday = (weeks?: StudentStudyWeek[] | null) => {
  if (!weeks?.length) return undefined;
  return weeks.find((week) => isDateBetween(new Date(), week.start_date, week.end_date));
};

export const findPreviousStudyWeek = (weeks?: StudentStudyWeek[] | null, fromWeek?: StudentStudyWeek) => {
  if (!weeks?.length || !fromWeek) return undefined;
  if (fromWeek.week_number > 1) {
    const byNumber = weeks.find((week) => week.week_number === fromWeek.week_number - 1);
    if (byNumber) return byNumber;
  }
  const sorted = [...weeks].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const index = sorted.findIndex((week) => week.id === fromWeek.id);
  return index > 0 ? sorted[index - 1] : undefined;
};

export const buildWeekRows = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return [];
  const rows: Array<Array<{ label: string; date: string; inRange: boolean }>> = [];
  let current = startOfDay(startDate);
  const end = startOfDay(endDate);
  let currentRow: Array<{ label: string; date: string; inRange: boolean }> = [];

  while (current.getTime() <= end.getTime()) {
    const day = current.getDay();
    const isoWeekday = day === 0 ? 7 : day;
    if (currentRow.length > 0 && isoWeekday === 1) {
      rows.push(currentRow);
      currentRow = [];
    }
    currentRow.push({ label: DAY_LABELS[day] ?? "", date: toDateKey(current), inRange: true });
    current = addDays(current, 1);
  }

  if (currentRow.length > 0) {
    let pad = addDays(currentRow[currentRow.length - 1]!.date, 1);
    while (currentRow.length < 7) {
      currentRow.push({ label: DAY_LABELS[pad.getDay()] ?? "", date: toDateKey(pad), inRange: false });
      pad = addDays(pad, 1);
    }
    rows.push(currentRow);
  }

  return rows;
};

export const countItemsBySkill = (items?: StudentStudyItem[] | null) => {
  const result = {
    reading: { done: 0, total: 0 },
    listening: { done: 0, total: 0 },
    writing: { done: 0, total: 0 },
    speaking: { done: 0, total: 0 },
  };
  items?.forEach((item) => {
    const key = item.study_item?.target_skill?.toLowerCase() as keyof typeof result;
    if (!result[key]) return;
    result[key].total += 1;
    if (item.status === "completed") result[key].done += 1;
  });
  return result;
};

export const buildStudyItemUrl = (
  item?: StudentStudyItem,
  classMeta?: StudyClassMeta,
  result = false,
) => {
  const studyItem = item?.study_item;
  if (!studyItem || !item?.id) return undefined;
  const { item_type, content_ref_id, type } = studyItem;
  const typeName = type ? SKILL_TYPE_LABELS[type]?.toLowerCase() : undefined;
  const answerId = item.answer_data?.[0]?.id;
  const lessonType = ["video", "lesson", "document", "interactive"].includes(item_type ?? "");

  if (result && answerId) {
    if (type === 3) return `${ELEARNING_DOMAIN}/homework/writing/${answerId}`;
    if (type === 4) return `${ELEARNING_DOMAIN}/homework/speaking/${answerId}`;
    if (typeName && [1, 2, 9, 10].includes(type ?? 0)) {
      return `${ELEARNING_DOMAIN}/class/${classMeta?.class_id}/course/${classMeta?.course_id}/section/${classMeta?.section_id}/${typeName}/${content_ref_id}?type=review&answerId=${answerId}`;
    }
  }

  if (lessonType) {
    return `${APP_DOMAIN}/lesson-detail/${content_ref_id}?student_study_item_id=${item.id}`;
  }
  if (typeName && QUIZ_TYPE_IDS.includes(type ?? 0)) {
    return `${ELEARNING_DOMAIN}/class/${classMeta?.class_id}/course/${classMeta?.course_id}/section/${classMeta?.section_id}/${typeName}/${content_ref_id}`;
  }
  if (item_type === "vocab") return `${ELEARNING_DOMAIN}/vocabulary-bank?set=${content_ref_id}`;
  return `${APP_DOMAIN}/lesson-detail/${content_ref_id}?student_study_item_id=${item.id}`;
};

function startOfDay(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: string | Date, days: number) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}
