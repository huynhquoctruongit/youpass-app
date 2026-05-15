import { useCallback, useEffect, useMemo, useState } from "react";
import { studyApi } from "@/services/api/study";
import { findStudyWeekForToday, isDateBetween } from "@/services/helpers/study";
import type { StudyPlan, StudyPlanDetail, StudentStudyWeek, StudyWeekDetail } from "@/types/study";

type LoadState = {
  loading: boolean;
  error: string | null;
};

export function useStudyProgress() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [planDetail, setPlanDetail] = useState<StudyPlanDetail | null>(null);
  const [activeWeek, setActiveWeek] = useState<StudentStudyWeek | null>(null);
  const [weekDetail, setWeekDetail] = useState<StudyWeekDetail | null>(null);
  const [state, setState] = useState<LoadState>({ loading: true, error: null });
  const [weekLoading, setWeekLoading] = useState(false);

  const planActive = useMemo(
    () =>
      plans.find(
        (plan) =>
          plan.status === "in_progress" &&
          isDateBetween(new Date(), plan.start_date, plan.end_date),
      ) ?? null,
    [plans],
  );

  const loadPlan = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const list = await studyApi.getStudyPlans();
      const nextPlans = list?.items ?? [];
      setPlans(nextPlans);
      const active =
        nextPlans.find(
          (plan) =>
            plan.status === "in_progress" &&
            isDateBetween(new Date(), plan.start_date, plan.end_date),
        ) ?? null;

      if (!active?.id) {
        setPlanDetail(null);
        setActiveWeek(null);
        setWeekDetail(null);
        return;
      }

      const detail = await studyApi.getStudyPlan(active.id);
      setPlanDetail(detail);
      const nextWeek = findStudyWeekForToday(detail?.student_study_weeks) ?? detail?.student_study_weeks?.[0] ?? null;
      setActiveWeek(nextWeek);
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tải tiến độ học.",
      });
      return;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const loadWeek = useCallback(
    async (week = activeWeek) => {
      if (!planActive?.id || !week?.id) return;
      setWeekLoading(true);
      try {
        const detail = await studyApi.getStudyWeek(planActive.id, week.id);
        setWeekDetail(detail);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Không thể tải dữ liệu tuần.",
        }));
      } finally {
        setWeekLoading(false);
      }
    },
    [activeWeek, planActive?.id],
  );

  const selectWeek = useCallback((week: StudentStudyWeek) => {
    setActiveWeek(week);
    setWeekDetail(null);
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (activeWeek) {
      loadWeek(activeWeek);
    }
  }, [activeWeek, loadWeek]);

  return {
    activeWeek,
    error: state.error,
    loading: state.loading,
    planActive,
    planDetail,
    refresh: loadPlan,
    refreshWeek: loadWeek,
    selectWeek,
    weekDetail,
    weekLoading,
  };
}
