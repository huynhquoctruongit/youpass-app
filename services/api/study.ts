import AxiosAPI from "./axios-client";
import type {
  LessonDetail,
  StudyPlanDetail,
  StudyPlanListResponse,
  StudyWeekDetail,
  WeekReflectionFormData,
} from "@/types/study";

const unwrap = <T>(response: { data?: { data?: T } }) => response.data?.data as T;

export const studyApi = {
  getStudyPlans: async () => {
    const res = await AxiosAPI.get("/v1/students/study-plans");
    return unwrap<StudyPlanListResponse>(res);
  },

  getStudyPlan: async (planId: string) => {
    const res = await AxiosAPI.get(`/v1/students/study-plans/${planId}`);
    return unwrap<StudyPlanDetail>(res);
  },

  getStudyWeek: async (planId: string, weekId: string) => {
    const res = await AxiosAPI.get(`/v1/students/study-plans/${planId}/weeks/${weekId}`);
    return unwrap<StudyWeekDetail>(res);
  },

  saveReflection: async (weekNumber: number, payload: WeekReflectionFormData) => {
    const res = await AxiosAPI.put(`/v1/study-weeks/${weekNumber}/reflection`, payload);
    return unwrap<StudyWeekDetail>(res);
  },

  markWeekReportViewed: async (planId: string, weekId: string) => {
    const res = await AxiosAPI.patch(`/v1/students/study-plans/${planId}/weeks/${weekId}/report`, {
      status: "viewed",
    });
    return unwrap(res);
  },

  completeStudyItem: async (itemId: string, payload: { completed_duration: number; started_at: string }) => {
    const res = await AxiosAPI.patch(`/v1/study-items/${itemId}/complete`, payload);
    return unwrap(res);
  },

  getLessonDetail: async (lessonId: string) => {
    const res = await AxiosAPI.get(
      `/items/lesson/${lessonId}?fields=*,documents.*,documents.directus_files_id.*`,
    );
    return unwrap<LessonDetail>(res);
  },
};
