import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Button, Dimensions, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useStudyProgress } from "@/hooks/use-study-plan";
import { studyApi } from "@/services/api/study";
import {
  buildStudyItemUrl, buildWeekRows, CHALLENGES_OPTIONS, convertMinsToHrsMins, countItemsBySkill, DEFAULT_WEEK_REFLECTION_DATA, findPreviousStudyWeek, findStudyWeekForToday, formatDate, formatDateTime, getBandScore, isDateBetween, isFutureDate, ITEM_TYPE_LABELS, MOOD_OPTIONS, toDateKey,
} from "@/services/helpers/study";
import { getFullName } from "@/services/helpers/user";
import type { StudentStudyItem, StudentStudyWeek, StudyClassMeta, StudyPlan, StudyPlanDetail, StudyWeekDetail, WeekReflectionFormData, } from "@/types/study";
import { Button as ButtonSystem } from "@/components/ui/button-system";
import { Colors } from "@/services/constant";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

export function MyProgressScreen() {
  const { profile, isLoading: authLoading } = useAuth();
  const { activeWeek, error, loading, planActive, planDetail, refresh, refreshWeek, selectWeek, weekDetail, weekLoading } = useStudyProgress();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <ScreenState icon="hourglass-empty" title="Đang tải tiến độ học..." />
    );
  }

  if (!profile) {
    return (
      <ScreenState
        icon="lock-outline"
        title="Vui lòng đăng nhập"
        description="Bạn cần đăng nhập để xem lộ trình và tiến độ học."
      />
    );
  }

  if (error) {
    return (
      <ScreenState
        icon="error-outline"
        title="Không thể tải tiến độ"
        description={error}
        actionLabel="Thử lại"
        onAction={refresh}
      />
    );
  }

  if (!planActive || !planDetail) {
    return (
      <ScreenState
        icon="inbox"
        title="Không có dữ liệu"
        description="Khi có tiến trình học, thông tin sẽ hiển thị tại đây."
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-neutral-50">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f97316" />
        }
        showsVerticalScrollIndicator={false}
      >
        <Header fullName={getFullName(profile)} />
        <RoadmapCard
          activeWeek={activeWeek}
          planDetail={planDetail}
          selectWeek={selectWeek}
        />
        <WeekDashboard
          activeWeek={activeWeek}
          classMeta={planActive.class_meta}
          currentWeekNumber={findStudyWeekForToday(planDetail.student_study_weeks)?.week_number}
          planActive={planActive}
          planDetail={planDetail}
          refreshWeek={refreshWeek}
          weekDetail={weekDetail}
          weekLoading={weekLoading}
        />
        <NextWeekPrompt planActive={planActive} planDetail={planDetail} onDone={refresh} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ fullName }: { fullName: string }) {
  const [openMenu, setOpenMenu] = useState(false);
  const screenW = Dimensions.get("window").width;
  const slideX = useRef(new Animated.Value(-screenW)).current;

  const backdropOpacity = useMemo(
    () =>
      slideX.interpolate({
        inputRange: [-screenW, 0],
        outputRange: [0.45, 0],
        extrapolate: "clamp",
      }),
    [slideX, screenW],
  );

  useEffect(() => {
    if (!openMenu) return;
    const w = Dimensions.get("window").width;
    slideX.setValue(-w);
    Animated.timing(slideX, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [openMenu, slideX]);

  const closeMenu = () => {
    const w = Dimensions.get("window").width;
    Animated.timing(slideX, {
      toValue: -w,
      duration: 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOpenMenu(false);
    });
  };

  const handleOpenMenu = () => {
    if (openMenu) closeMenu();
    else setOpenMenu(true);
  };

  return (
    <View className="px-1 flex flex-row gap-2 items-center">
      <Pressable className="pt-0.5" onPress={handleOpenMenu}>
        <MaterialIcons name="menu" size={24} color={Colors.dark["50"]} accessibilityLabel="Menu" />
      </Pressable>
      <Text className="mt-1 text-t3-semibold text-dark-75">
        Chào mừng <Text className="text-primary-01">{fullName}</Text>
      </Text>
      <Modal
        visible={openMenu}
        animationType="none"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={closeMenu}
      >
        <View style={{ flex: 1 }}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#000", opacity: backdropOpacity },
            ]}
          />
          <SafeAreaProvider>
            <Animated.View style={{ flex: 1, backgroundColor: "#fff", transform: [{ translateX: slideX }] }}>
              <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
                <View className="flex-row items-center px-4 py-3">
                  <Text className="text-lg font-bold text-neutral-900">Menu</Text>
                  <Pressable className="ml-auto" onPress={closeMenu} hitSlop={12} accessibilityLabel="Đóng menu">
                    <MaterialIcons name="close" size={28} color={Colors.dark["50"]} />
                  </Pressable>
                </View>
              </SafeAreaView>
            </Animated.View>
          </SafeAreaProvider>
        </View>
      </Modal>
    </View>
  );
}

function RoadmapCard({
  activeWeek,
  planDetail,
  selectWeek,
}: {
  activeWeek: StudentStudyWeek | null;
  planDetail: StudyPlanDetail;
  selectWeek: (week: StudentStudyWeek) => void;
}) {
  const weeks = planDetail.student_study_weeks ?? [];
  const maxItems = Math.max(1, ...weeks.map((week) => week.total_study_items ?? 0));

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-neutral-900">
          Lộ trình {weeks.length || 0} tuần
        </Text>
        <View className="rounded-full bg-orange-50 px-3 py-1">
          <Text className="text-xs font-semibold text-orange-600">
            Streak {planDetail.streak_weeks?.current ?? 0} tuần
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {weeks.map((week) => {
          const isActive = activeWeek?.id === week.id;
          const plannedHeight = Math.max(28, ((week.total_study_items ?? 0) / maxItems) * 96);
          const doneHeight = Math.max(0, ((week.completed_study_items ?? 0) / maxItems) * 96);
          const isCurrent = isDateBetween(new Date(), week.start_date, week.end_date);

          return (
            <Pressable
              key={week.id}
              onPress={() => selectWeek(week)}
              className={`w-14 items-center rounded-xl border px-2 py-3 ${isActive ? "border-orange-500 bg-orange-50" : "border-neutral-200 bg-white"
                }`}
            >
              {isCurrent ? <MaterialIcons name="arrow-drop-down" size={20} color="#f97316" /> : null}
              <View className="h-24 w-8 justify-end overflow-hidden rounded-md bg-neutral-200">
                <View style={{ height: doneHeight }} className="w-full rounded-md bg-green-400" />
                <View style={{ height: Math.max(0, plannedHeight - doneHeight) }} />
              </View>
              <Text className={`mt-2 text-xs font-bold ${isActive ? "text-orange-600" : "text-neutral-500"}`}>
                T{week.week_number}
              </Text>
              <Text className="text-[10px] text-neutral-400">
                {week.completed_study_items ?? 0}/{week.total_study_items ?? 0}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mt-1 flex-row rounded-xl border border-neutral-100 bg-neutral-50 p-3">
        <Metric label="Target band" value={getBandScore(planDetail.target_band)} />
        <Metric label="Lịch thi" value={formatDate(planDetail.target_exam_date, { month: "2-digit", year: "numeric" })} />
        <Metric label="Học mỗi ngày" value={convertMinsToHrsMins(planDetail.daily_minutes)} />
      </View>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value?: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <Text className="text-center text-[11px] text-neutral-500">{label}</Text>
      <Text className="text-center text-sm font-bold text-orange-600">{value || "--"}</Text>
    </View>
  );
}

function WeekDashboard({
  activeWeek,
  classMeta,
  currentWeekNumber,
  planActive,
  planDetail,
  refreshWeek,
  weekDetail,
  weekLoading,
}: {
  activeWeek: StudentStudyWeek | null;
  classMeta?: StudyClassMeta;
  currentWeekNumber?: number;
  planActive: StudyPlan;
  planDetail: StudyPlanDetail;
  refreshWeek: () => Promise<void>;
  weekDetail: StudyWeekDetail | null;
  weekLoading: boolean;
}) {
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const week = activeWeek ?? weekDetail;
  const items = weekDetail?.student_study_item ?? [];
  const learned = items.filter((item) => item.status === "completed").length;
  const total = items.length;
  const percent = total > 0 ? Math.round((learned / total) * 100) : 0;
  const unfinished = items.filter((item) => item.status !== "completed");
  const finished = items.filter((item) => item.status === "completed");
  const availableLesson = unfinished.find(
    (item) => !item.prerequisite_items?.some((pre) => pre.status === "not_started"),
  );
  const isCurrentWeek = Boolean(week && isDateBetween(new Date(), week.start_date, week.end_date));
  const isFutureWeek = isFutureDate(week?.start_date);
  const weekRows = buildWeekRows(week?.start_date, week?.end_date);
  const totalDays = week?.start_date && week?.end_date
    ? Math.round((new Date(week.end_date).getTime() - new Date(week.start_date).getTime()) / 86400000) + 1
    : 0;

  if (!week) {
    return <ScreenState icon="event-busy" title="Chưa có tuần học" />;
  }

  return (
    <>
      <Card>
        <View className="flex-row items-start gap-4">
          <ProgressRing current={learned} total={total} />
          <View className="flex-1 gap-2">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-xl font-bold text-neutral-900">Tuần {week.week_number}</Text>
              <Text className="text-sm text-neutral-500">
                {formatDate(week.start_date)} - {formatDate(week.end_date)}
              </Text>
              {isCurrentWeek ? (
                <Text className="rounded-full border border-orange-500 px-2 py-1 text-xs font-bold text-orange-500">
                  Tuần này
                </Text>
              ) : null}
            </View>
            <Text className="text-sm text-neutral-600">
              <Text className="font-bold text-green-600">{learned}/</Text>
              {total} bài - {convertMinsToHrsMins(week.total_minutes_planned)} học
            </Text>
            {isFutureWeek ? (
              <Text className="text-sm leading-5 text-neutral-500">
                Đây là Study plan của tuần tương lai. Bạn có thể học trước nếu muốn,
                lịch sử học sẽ được cập nhật vào tuần hiện tại
                <Text className="font-bold text-green-600"> (Tuần {currentWeekNumber || 1})</Text>.
              </Text>
            ) : null}
          </View>
        </View>

        <WeekProgress weekDetail={weekDetail} weekRows={weekRows} isFutureWeek={isFutureWeek} totalDays={totalDays} />

        {!isFutureWeek && !isCurrentWeek ? <SkillOverview items={items} /> : null}
        {(!isFutureWeek && !isCurrentWeek) || (percent === 100 && isCurrentWeek) ? (
          <ReflectionPreview
            reflection={weekDetail?.student_study_reflection}
            onPress={() => setReflectionOpen(true)}
          />
        ) : null}
      </Card>

      {weekLoading ? (
        <View className="items-center py-4">
          <ActivityIndicator color="#f97316" />
        </View>
      ) : null}

      {isCurrentWeek && weekDetail ? (
        <NextLessonCard
          classMeta={classMeta}
          lesson={availableLesson}
          percent={percent}
          planDetail={planDetail}
          week={week}
        />
      ) : null}

      {unfinished.length > 0 ? (
        <TaskSection
          classMeta={classMeta}
          isCurrentWeek={isCurrentWeek}
          isFutureWeek={isFutureWeek}
          onChanged={refreshWeek}
          title="Chưa hoàn thành"
          tasks={unfinished}
        />
      ) : null}

      {finished.length > 0 ? (
        <TaskSection
          classMeta={classMeta}
          isCurrentWeek={isCurrentWeek}
          isFutureWeek={isFutureWeek}
          onChanged={refreshWeek}
          title="Đã hoàn thành"
          tasks={finished}
        />
      ) : null}

      <ReflectionModal
        defaultData={weekDetail?.student_study_reflection ?? DEFAULT_WEEK_REFLECTION_DATA}
        onClose={() => setReflectionOpen(false)}
        onSaved={refreshWeek}
        open={reflectionOpen}
        weekNumber={week.week_number}
      />
    </>
  );
}

function ProgressRing({ current, total }: { current: number; total: number }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <View className="h-20 w-20 items-center justify-center rounded-full border-8 border-green-200 bg-white">
      <Text className="text-lg font-bold text-green-600">{percent}%</Text>
      <Text className="text-[10px] text-neutral-500">{current}/{total}</Text>
    </View>
  );
}

function WeekProgress({
  isFutureWeek,
  totalDays,
  weekDetail,
  weekRows,
}: {
  isFutureWeek: boolean;
  totalDays: number;
  weekDetail: StudyWeekDetail | null;
  weekRows: { label: string; date: string; inRange: boolean }[][];
}) {
  const todayKey = toDateKey(new Date());
  return (
    <View className="border-t border-neutral-100 pt-4">
      <Text className="mb-2 text-sm text-neutral-500">
        {isFutureWeek
          ? `Tuần ${weekDetail?.week_number ?? ""} chưa bắt đầu!`
          : `Bạn đã học ${weekDetail?.active_learning_weekdays?.length ?? 0}/${totalDays} ngày trong tuần!`}
      </Text>
      <View className="gap-1">
        {weekRows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-2">
            {row.map((day) => {
              const isActive = day.inRange && weekDetail?.active_learning_weekdays?.some((value) => toDateKey(value) === day.date);
              const isToday = day.date === todayKey;
              return (
                <View
                  key={day.date}
                  className={`h-9 w-9 items-center justify-center rounded-full border ${isActive ? "border-green-200 bg-green-100" : isToday ? "border-orange-500 bg-white" : "border-transparent bg-neutral-50"
                    } ${!day.inRange ? "opacity-30" : ""}`}
                >
                  <Text className={`text-xs font-bold ${isActive ? "text-green-600" : "text-neutral-500"}`}>
                    {day.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function SkillOverview({ items }: { items: StudentStudyItem[] }) {
  const skillCounts = countItemsBySkill(items);
  const rows = [
    ["reading", "Reading", "menu-book"],
    ["listening", "Listening", "headset"],
    ["writing", "Writing", "edit"],
    ["speaking", "Speaking", "mic"],
  ] as const;

  return (
    <View className="flex-row flex-wrap gap-2 border-t border-neutral-100 pt-4">
      {rows.map(([key, label, icon]) => {
        const row = skillCounts[key];
        return (
          <View key={key} className="min-w-[46%] flex-1 flex-row items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2">
            <MaterialIcons name={icon} size={18} color="#92400e" />
            <Text className="flex-1 text-sm text-neutral-700">{label}</Text>
            <Text className="text-sm font-bold text-neutral-900">
              {row.done}/{row.total}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ReflectionPreview({
  onPress,
  reflection,
}: {
  onPress: () => void;
  reflection?: WeekReflectionFormData | null;
}) {
  const mood = MOOD_OPTIONS.find((item) => item.value === reflection?.mood);
  return (
    <Pressable onPress={onPress} className="rounded-xl bg-orange-50 p-4">
      <View className="flex-row items-center gap-2">
        <MaterialIcons name="edit" size={20} color="#737373" />
        <Text className="flex-1 text-sm text-neutral-700">
          {reflection?.note || "Tuần này của bạn thế nào...?"}
        </Text>
        {mood ? <Text className="text-sm text-orange-600">{mood.emoji} {mood.label}</Text> : null}
      </View>
    </Pressable>
  );
}

function NextLessonCard({
  classMeta,
  lesson,
  percent,
  planDetail,
  week,
}: {
  classMeta?: StudyClassMeta;
  lesson?: StudentStudyItem;
  percent: number;
  planDetail: StudyPlanDetail;
  week: StudentStudyWeek;
}) {
  const nextWeek = planDetail.student_study_weeks?.find((item) => item.week_number === week.week_number + 1);

  if (percent === 100) {
    return (
      <Card>
        <Text className="text-base font-bold text-green-600">
          Bạn đã hoàn thành tất cả bài học tuần này!
        </Text>
        <Text className="text-sm text-neutral-500">
          Bạn có thể xem tuần tiếp theo trong roadmap phía trên để học trước.
        </Text>
        {nextWeek ? (
          <Text className="text-sm font-semibold text-orange-600">Tuần tiếp theo: Tuần {nextWeek.week_number}</Text>
        ) : null}
      </Card>
    );
  }

  if (!lesson) return null;
  return (
    <Card>
      <Text className="text-lg font-bold text-neutral-900">Bài tiếp theo</Text>
      <TaskCard
        classMeta={classMeta}
        isCurrentWeek
        isFutureWeek={false}
        onChanged={async () => undefined}
        task={lesson}
        variant="highlight"
      />
    </Card>
  );
}

function TaskSection({
  classMeta,
  isCurrentWeek,
  isFutureWeek,
  onChanged,
  tasks,
  title,
}: {
  classMeta?: StudyClassMeta;
  isCurrentWeek: boolean;
  isFutureWeek: boolean;
  onChanged: () => Promise<void>;
  tasks: StudentStudyItem[];
  title: string;
}) {
  return (
    <View className="gap-3">
      <Text className="px-2 text-lg font-bold text-neutral-900">
        {title} <Text className="text-neutral-400">({tasks.length})</Text>
      </Text>
      <View className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            classMeta={classMeta}
            isCurrentWeek={isCurrentWeek}
            isFutureWeek={isFutureWeek}
            onChanged={onChanged}
            task={task}
          />
        ))}
      </View>
    </View>
  );
}

function TaskCard({
  classMeta,
  isCurrentWeek,
  isFutureWeek,
  onChanged,
  task,
  variant = "default",
}: {
  classMeta?: StudyClassMeta;
  isCurrentWeek: boolean;
  isFutureWeek: boolean;
  onChanged: () => Promise<void>;
  task: StudentStudyItem;
  variant?: "default" | "highlight";
}) {
  const [loading, setLoading] = useState(false);
  const startTimeRef = useRef(Date.now());
  const studyItem = task.study_item;
  const isDone = task.status === "completed";
  const isMissed = task.status === "missed";
  const isDisabled = task.prerequisite_items?.some((item) => item.status === "not_started");
  const isCanLearn = !task.prerequisite_items?.length || task.prerequisite_items.every((item) => item.status === "completed");
  const isPastUnavailable = !isFutureWeek && !isCurrentWeek && !isDone;
  const answer = task.answer_data?.[0];
  const score = answer?.band_score_100 ?? answer?.band_score;
  const answerSummary = answer?.summary;
  const waitingReview = !score && [3, 4].includes(studyItem?.type ?? 0) && ["homework", "quiz"].includes(studyItem?.item_type ?? "");

  const openLesson = async () => {
    if (isDisabled || isPastUnavailable) return;
    const url = buildStudyItemUrl(task, classMeta, isDone);
    if (!url) return;
    await Linking.openURL(url);
  };

  const completeVocab = async () => {
    if (loading || !task.id) return;
    const secondsCompleted = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const startedAt = new Date(startTimeRef.current).toISOString().replace(/\.\d{3}Z$/, "Z");
    setLoading(true);
    try {
      await studyApi.completeStudyItem(task.id, {
        completed_duration: secondsCompleted,
        started_at: startedAt,
      });
      await onChanged();
      Alert.alert("Thành công", "Hoàn thành bài học.");
    } catch {
      Alert.alert("Có lỗi xảy ra", "Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={openLesson}
      className={`flex-row gap-3 border-b border-neutral-100 p-4 last:border-b-0 ${variant === "highlight" ? "rounded-xl border border-orange-200 bg-orange-50" : "bg-white"
        } ${(isDisabled || isPastUnavailable) && !isCanLearn ? "opacity-50" : ""}`}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${isDone ? "bg-green-100" : "bg-orange-100"}`}>
        <MaterialIcons
          name={isDone ? "check-circle" : iconForItemType(studyItem?.item_type)}
          size={22}
          color={isDone ? "#16a34a" : "#f97316"}
        />
      </View>

      <View className="flex-1 gap-1">
        <Text className="text-sm text-neutral-500">{ITEM_TYPE_LABELS[studyItem?.item_type ?? ""] ?? "Bài học"}</Text>
        <Text className={`text-base font-bold ${isDone || isPastUnavailable ? "text-neutral-500" : "text-neutral-900"}`}>
          {studyItem?.title || "Bài học"}
        </Text>
        {isFutureWeek && isCanLearn ? <Text className="text-sm text-green-600">Có thể học trước</Text> : null}
        {isDone ? (
          <Text className="text-xs text-neutral-500">
            Hoàn thành: {formatDateTime(task.completed_at)}
            {answerSummary?.total ? ` - Điểm: ${answerSummary.correct}/${answerSummary.total}` : ""}
            {!waitingReview && score ? ` - Band: ${answer?.band_score_100 ? answer.band_score_100 : getBandScore(score)}` : ""}
          </Text>
        ) : null}
        {waitingReview ? <Text className="text-xs text-yellow-600">Đang đợi chấm...</Text> : null}
        {isMissed ? <Text className="text-xs text-yellow-600">Đã phân bổ lại</Text> : null}
        {isDisabled ? <Text className="text-xs text-neutral-500">Hoàn thành các bài học cũ để mở khóa</Text> : null}
      </View>

      <View className="items-end gap-2">
        <Text className="text-xs text-neutral-500">{studyItem?.duration_minutes ?? 0} phút</Text>
        {studyItem?.item_type === "vocab" && !isDone && !isDisabled && isCanLearn ? (
          <Pressable
            onPress={completeVocab}
            className="rounded-full bg-green-100 px-3 py-2"
          >
            {loading ? (
              <ActivityIndicator color="#16a34a" />
            ) : (
              <Text className="text-xs font-bold text-green-700">Hoàn thành</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function ReflectionModal({
  defaultData,
  onClose,
  onSaved,
  open,
  weekNumber,
}: {
  defaultData: WeekReflectionFormData;
  onClose: () => void;
  onSaved: () => Promise<void>;
  open: boolean;
  weekNumber: number;
}) {
  const [data, setData] = useState<WeekReflectionFormData>(defaultData);
  const [saving, setSaving] = useState(false);
  const canSave = data.mood != null || data.challenges.length > 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await studyApi.saveReflection(weekNumber, data);
      await onSaved();
      onClose();
      Alert.alert("Thành công", "Lưu reflection thành công.");
    } catch {
      Alert.alert("Có lỗi xảy ra", "Vui lòng thử lại sau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-white p-5">
          <View className="mb-4 flex-row items-center gap-2">
            <MaterialIcons name="edit" size={20} color="#737373" />
            <Text className="text-lg font-bold text-neutral-900">Reflection tuần {weekNumber}</Text>
          </View>

          <ScrollView contentContainerStyle={{ gap: 20 }}>
            <View className="gap-3">
              <Text className="text-sm font-semibold text-neutral-800">Tuần này của bạn thế nào?</Text>
              <View className="flex-row flex-wrap gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    active={data.mood === option.value}
                    label={`${option.emoji} ${option.label}`}
                    onPress={() =>
                      setData((prev) => ({
                        ...prev,
                        mood: prev.mood === option.value ? null : option.value,
                      }))
                    }
                  />
                ))}
              </View>
            </View>

            <View className="gap-3">
              <Text className="text-sm font-semibold text-neutral-800">Điều làm bạn thấy khó khăn nhất?</Text>
              <View className="flex-row flex-wrap gap-2">
                {CHALLENGES_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    active={data.challenges.includes(option.value)}
                    label={option.label}
                    onPress={() =>
                      setData((prev) => ({
                        ...prev,
                        challenges: prev.challenges.includes(option.value) ? [] : [option.value],
                      }))
                    }
                  />
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-neutral-800">Cụ thể hơn nhé:</Text>
              <TextInput
                multiline
                value={data.note}
                onChangeText={(note) => setData((prev) => ({ ...prev, note }))}
                placeholder="Ví dụ: Bạn sẽ sắp xếp lại lịch học tuần tới như thế nào..."
                className="min-h-28 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View className="mt-5 flex-row gap-3">
            <ButtonSystem variant="secondary-default" size="xs" onPress={onClose} className="">Hủy bỏ</ButtonSystem>
            <ButtonSystem variant="primary-default" size="xs" onPress={save} className="">Lưu thay đổi</ButtonSystem>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NextWeekPrompt({
  onDone,
  planActive,
  planDetail,
}: {
  onDone: () => Promise<void>;
  planActive: StudyPlan;
  planDetail: StudyPlanDetail;
}) {
  const [visible, setVisible] = useState(true);
  const todayWeek = findStudyWeekForToday(planDetail.student_study_weeks);
  const previousWeek = findPreviousStudyWeek(planDetail.student_study_weeks, todayWeek);
  const shouldShow =
    visible &&
    previousWeek?.student_study_week_report?.status === "done" &&
    todayWeek?.week_number !== 1 &&
    previousWeek?.status === "completed";

  const close = async () => {
    setVisible(false);
    if (previousWeek?.id && planActive.id) {
      try {
        await studyApi.markWeekReportViewed(planActive.id, previousWeek.id);
        await onDone();
      } catch {
        Alert.alert("Có lỗi xảy ra", "Không thể cập nhật báo cáo tuần.");
      }
    }
  };

  if (!shouldShow || !previousWeek) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="w-full rounded-3xl bg-white p-5">
          <Text className="text-xl font-bold text-neutral-900">Tổng kết tuần {previousWeek.week_number}</Text>
          <Text className="mt-2 text-sm leading-5 text-neutral-600">
            Bạn đã hoàn thành {previousWeek.student_study_week_report?.completion_rate ?? 0}% kế hoạch tuần trước.
            Hãy xem lại tiến độ và tiếp tục tuần mới nhé.
          </Text>
          <Pressable onPress={close} className="mt-5 rounded-full bg-orange-500 py-3">
            <Text className="text-center font-bold text-white">Đã xem</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${active ? "border-orange-500 bg-orange-50" : "border-neutral-200 bg-white"
        }`}
    >
      <Text className={`text-sm ${active ? "font-semibold text-orange-600" : "text-neutral-700"}`}>{label}</Text>
    </Pressable>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <View className="gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
      {children}
    </View>
  );
}

function ScreenState({
  actionLabel,
  description,
  icon,
  onAction,
  title,
}: {
  actionLabel?: string;
  description?: string;
  icon: MaterialIconName;
  onAction?: () => void;
  title: string;
}) {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <MaterialIcons name={icon} size={48} color="#a3a3a3" />
        <Text className="text-center text-lg font-bold text-neutral-800">{title}</Text>
        {description ? <Text className="text-center text-sm text-neutral-500">{description}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} className="mt-2 rounded-full bg-orange-500 px-5 py-3">
            <Text className="font-bold text-white">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function iconForItemType(itemType?: string): MaterialIconName {
  if (itemType === "vocab") return "translate";
  if (itemType === "video") return "play-circle-outline";
  if (itemType === "audio") return "headset";
  if (itemType === "document") return "article";
  if (itemType === "quiz" || itemType === "homework") return "assignment";
  return "menu-book";
}
