export type StudyPlanStatus = "not_started" | "in_progress" | "completed" | string;
export type StudyItemStatus = "not_started" | "in_progress" | "completed" | "missed" | string;

export type WeekReflectionMood = "great" | "satisfied" | "neutral" | "struggling";

export type WeekReflectionFormData = {
  mood: WeekReflectionMood | null;
  challenges: string[];
  note: string;
};

export type StudyClassMeta = {
  class_id?: string | number;
  course_id?: string | number;
  section_id?: string | number;
};

export type StudyPlan = {
  id: string;
  status?: StudyPlanStatus;
  start_date?: string;
  end_date?: string;
  class_meta?: StudyClassMeta;
};

export type StudyPlanListResponse = {
  items?: StudyPlan[];
};

export type StudentStudyWeekReport = {
  status?: string;
  completion_rate?: number;
  mood?: WeekReflectionMood | null;
  challenges?: string[];
  note?: string;
};

export type StudentStudyWeek = {
  id: string;
  student_study_plan_id?: string;
  week_number: number;
  status?: string;
  start_date: string;
  end_date: string;
  total_minutes_planned?: number;
  total_study_items?: number;
  completed_study_items?: number;
  student_study_week_report?: StudentStudyWeekReport;
};

export type StudyPlanDetail = StudyPlan & {
  student_study_weeks?: StudentStudyWeek[];
  target_exam_date?: string;
  target_band?: number | string;
  daily_minutes?: number;
  streak_weeks?: { current?: number };
};

export type StudyItem = {
  id?: string | number;
  title?: string;
  item_type?: string;
  duration_minutes?: number;
  type?: number;
  content_ref_id?: string | number;
  target_skill?: string;
};

export type StudyAnswerSummary = {
  correct?: number;
  total?: number;
};

export type StudyAnswerData = {
  id?: string | number;
  band_score?: number;
  band_score_100?: number;
  summary?: StudyAnswerSummary;
};

export type StudentStudyItem = {
  id: string;
  status?: StudyItemStatus;
  completed_at?: string;
  study_item?: StudyItem;
  answer_data?: StudyAnswerData[];
  prerequisite_items?: Array<{ status?: StudyItemStatus }>;
};

export type StudyWeekDetail = StudentStudyWeek & {
  student_study_item?: StudentStudyItem[];
  student_study_reflection?: WeekReflectionFormData | null;
  active_learning_weekdays?: string[];
};
