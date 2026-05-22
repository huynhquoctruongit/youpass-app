import { DrawerContentScrollView, type DrawerContentComponentProps } from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { ZaloNewIcon } from "@/components/icons/zalo-new-icon";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStudyProgress } from "@/hooks/use-study-plan";
import type { StudentStudyWeek, StudyPlanDetail } from "@/types/study";
import { ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { isDateBetween } from "@/services/helpers/study";
import { getBandScore, convertMinsToHrsMins, formatDate } from "@/services/helpers/study";
import { ReactNode } from "react";
import { Colors } from "@/services/constant";

const ZALO_INTENSIVE_URL = "https://zalo.me/g/wyf8sb3smujzzxrqwsqc";

export function StudyDrawerContent(props: DrawerContentComponentProps) {
    const { activeWeek, loading, planDetail, selectWeek } = useStudyProgress();

    const insets = useSafeAreaInsets();
    const { navigation } = props;

    const closeDrawer = () => {
        navigation.dispatch(DrawerActions.closeDrawer());
    };

    const weeks = planDetail?.student_study_weeks ?? [];
    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 8 }}>
            <View className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-4 pb-4">
                <Text className="text-lg font-bold text-neutral-900">
                    Lộ trình {weeks.length || 0} tuần
                </Text>
                <Pressable onPress={closeDrawer} hitSlop={12} accessibilityLabel="Đóng menu">
                    <MaterialIcons name="close" size={24} color={Colors.dark["50"]} />
                </Pressable>
            </View>

            <DrawerContentScrollView
                {...props}
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingTop: 16,
                    paddingStart: 0,
                    paddingEnd: 0,
                    paddingBottom: insets.bottom + 16,
                    flexGrow: 1,
                }}
            >
                <View className="gap-4 px-4">
                    {loading ? (
                        <Text className="text-t4-regular text-neutral-500">Đang tải lộ trình...</Text>
                    ) : planDetail ? (
                        <RoadmapCard
                            activeWeek={activeWeek}
                            onSelectWeek={(week) => {
                                selectWeek(week);
                                closeDrawer();
                            }}
                            planDetail={planDetail}
                        />
                    ) : (
                        <Text className="text-sm text-neutral-500">
                            Chưa có dữ liệu lộ trình.
                        </Text>
                    )}
                    <ZaloIntensiveCard />
                </View>
            </DrawerContentScrollView>
        </View>
    );
}



const RoadmapCard = ({ activeWeek, onSelectWeek, planDetail }: {
    activeWeek: StudentStudyWeek | null;
    onSelectWeek: (week: StudentStudyWeek) => void;
    planDetail: StudyPlanDetail;
}) => {
    const weeks = planDetail.student_study_weeks ?? [];
    const maxItems = Math.max(1, ...weeks.map((week) => week.total_study_items ?? 0));
    return (
        <Card>
            <View className="flex-row items-center justify-center">
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
                            onPress={() => onSelectWeek(week)}
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

const Card = ({ children }: { children: ReactNode }) => {
    return (
        <View className="gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
            {children}
        </View>
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

const ZaloIntensiveCard = () => {
    const openZaloGroup = async () => {
        const canOpen = await Linking.canOpenURL(ZALO_INTENSIVE_URL);
        if (canOpen) {
            await Linking.openURL(ZALO_INTENSIVE_URL);
        }
    };

    return (
        <Pressable
            onPress={openZaloGroup}
            accessibilityRole="link"
            accessibilityLabel="Mở group Zalo Hỏi gì đáp nấy"
            className="relative border border-neutral-200 rounded-xl bg-white p-3 shadow-sm"
        >
            <View className="z-10 flex-col gap-1 pr-14">
                <View className="flex-row items-center gap-2">
                    <Text className="text-t3-bold leading-[38px] text-teritary-06">
                        Hỏi gì đáp nấy
                    </Text>
                    <MaterialIcons name="arrow-forward" size={15} color={Colors.teritary["06"]} />
                </View>
                <Text className="mt-2 text-t4-regular text-dark-50 w-4/5">
                    Group dành riêng cho khoá Intensive, luôn có giáo viên đồng hành
                </Text>
            </View>
            <View className="absolute top-0 right-2 opacity-90" accessibilityLabel="Zalo">
                <ZaloNewIcon width={50} height={43} />
            </View>
        </Pressable>
    );
}
