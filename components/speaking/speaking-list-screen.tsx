import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getQuizState,
  QUIZ_STATUS_META,
  speakingApi,
  summarizeTopicStates,
  formatBand,
  type SpeakingPart,
  type SpeakingTopic,
} from "@/services/api/speaking";

const CMS_URL = process.env.EXPO_PUBLIC_CMS || "";
const PRIMARY = "#F97316";
const { width: SW } = Dimensions.get("window");
const H_PAD = 16;
const GAP = 12;
const CARD_W = (SW - H_PAD * 2 - GAP) / 2;
const THUMB_H = CARD_W; // khung ảnh vuông

const PARTS: { key: SpeakingPart; label: string }[] = [
  { key: 1, label: "Part 1" },
  { key: 2, label: "Part 2" },
  { key: 3, label: "Part 3" },
];

function TopicCard({
  topic,
  part,
  onPress,
}: {
  topic: SpeakingTopic;
  part: SpeakingPart;
  onPress: () => void;
}) {
  const quizzes = topic.quizzes ?? [];
  const { total, done, bestBand, hasGrading } = summarizeTopicStates(quizzes);
  const allDone = total > 0 && done === total;
  const started = done > 0 || hasGrading;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const imageUrl = topic.thumbnail
    ? `${CMS_URL}/assets/${topic.thumbnail}?width=400&fit=contain`
    : null;

  // Badge góc phải: ưu tiên band cao nhất > đang chấm > tiến độ
  const progressBadgeColor = allDone
    ? "#10B981"
    : hasGrading
      ? "#B45309"
      : started
        ? PRIMARY
        : "rgba(17,24,39,0.55)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: CARD_W,
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#EFEFEF",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View style={{ width: CARD_W, height: THUMB_H, backgroundColor: "#FFF4EB" }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#FFEDD5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="mic" size={24} color={PRIMARY} />
              </View>
            </View>
          )}

          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: "rgba(17,24,39,0.55)",
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>
              Part {part}
            </Text>
          </View>

          {/* Band cao nhất nổi bật, nếu chưa có thì hiện tiến độ done/total */}
          {bestBand != null ? (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: "#10B981",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>
                {formatBand(bestBand)}
              </Text>
            </View>
          ) : (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: progressBadgeColor,
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 3,
                minWidth: 34,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff" }}>
                {done}/{total}
              </Text>
            </View>
          )}

          {/* Chỉ báo phụ: đang chấm */}
          {hasGrading && (
            <View
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                backgroundColor: "#B45309",
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 3,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Ionicons name="time" size={10} color="#fff" />
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>
                Đang chấm
              </Text>
            </View>
          )}

          {started && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: "rgba(0,0,0,0.12)",
              }}
            >
              <View
                style={{
                  width: `${pct}%`,
                  height: 3,
                  backgroundColor: allDone ? "#10B981" : PRIMARY,
                }}
              />
            </View>
          )}

          {allDone && (
            <View
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "#10B981",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, gap: 6 }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#111827",
              lineHeight: 18,
              minHeight: 36,
            }}
          >
            {topic.title}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: allDone
                  ? "#059669"
                  : started
                    ? PRIMARY
                    : "#9CA3AF",
              }}
              numberOfLines={1}
            >
              {allDone
                ? "Hoàn thành"
                : hasGrading
                  ? "Đang chấm bài..."
                  : started
                    ? `${done}/${total} đã làm`
                    : `${total} câu hỏi`}
            </Text>
            <Ionicons name="play-circle" size={18} color={PRIMARY} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function QuizPickerSheet({
  topic,
  part,
  visible,
  onClose,
}: {
  topic: SpeakingTopic | null;
  part: SpeakingPart;
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  if (!topic) return null;

  const quizzes = topic.quizzes ?? [];
  const { done } = summarizeTopicStates(quizzes);

  const openPractice = (quizId: string, answerId?: string) => {
    onClose();
    router.push({
      pathname: "/speaking-practice/[part]/[quizId]",
      params: {
        part: String(part),
        quizId,
        title: topic.title,
        ...(answerId ? { answerId } : {}),
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)" }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 10,
            paddingBottom: insets.bottom + 16,
            maxHeight: "72%",
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#E5E7EB",
              marginBottom: 14,
            }}
          />

          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <Text
              style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}
              numberOfLines={2}
            >
              {topic.title}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: "#6B7280" }}>
              Part {part} · {done}/{quizzes.length} đã làm
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 8,
              gap: 8,
            }}
            showsVerticalScrollIndicator={false}
          >
            {quizzes.map((quiz, index) => {
              const rawState = getQuizState(quiz);
              // Listing không hiển thị trạng thái lỗi → coi "failed" như "đã làm".
              const state =
                rawState.status === "failed"
                  ? { ...rawState, status: "graded" as const }
                  : rawState;
              const meta = QUIZ_STATUS_META[state.status];
              const answerId = state.answerId;

              // Gợi ý CTA theo trạng thái
              const hint =
                state.status === "graded"
                  ? state.band != null
                    ? `Band ${formatBand(state.band)} · Xem kết quả`
                    : "Đã làm · Xem lại / Chấm điểm"
                  : state.status === "free_saved"
                    ? "Đã lưu FREE · Chấm điểm ngay"
                    : state.status === "grading"
                      ? "Đang chấm, xem tiến trình"
                      : "Bắt đầu luyện";

              return (
                <Pressable
                  key={quiz.id}
                  onPress={() =>
                    openPractice(quiz.id, answerId ?? undefined)
                  }
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: pressed ? "#FFF7ED" : "#F9FAFB",
                    borderWidth: 1,
                    borderColor:
                      state.status === "not_started" ? "#F3F4F6" : meta.border,
                  })}
                >
                  {/* Avatar: band score / icon trạng thái / số thứ tự */}
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: meta.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {state.status === "graded" && state.band != null ? (
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "800",
                          color: meta.color,
                        }}
                      >
                        {formatBand(state.band)}
                      </Text>
                    ) : state.status === "not_started" ? (
                      <Text
                        style={{ fontSize: 13, fontWeight: "800", color: PRIMARY }}
                      >
                        {index + 1}
                      </Text>
                    ) : (
                      <Ionicons
                        name={meta.icon as never}
                        size={18}
                        color={meta.color}
                      />
                    )}
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#1F2937",
                      }}
                      numberOfLines={2}
                    >
                      {quiz.title}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {/* Badge trạng thái */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                          backgroundColor: meta.bg,
                          borderRadius: 999,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                        }}
                      >
                        {state.status === "grading" ? (
                          <ActivityIndicator size="small" color={meta.color} />
                        ) : (
                          <Ionicons
                            name={meta.icon as never}
                            size={10}
                            color={meta.color}
                          />
                        )}
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </Text>
                      </View>
                      <Text
                        style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 1 }}
                        numberOfLines={1}
                      >
                        {hint}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function SpeakingListScreen() {
  const [part, setPart] = useState<SpeakingPart>(1);
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SpeakingTopic | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      try {
        setError(null);
        const res = await speakingApi.getTopics(part, nextPage);
        setTopics((prev) =>
          replace ? res.topics : [...prev, ...res.topics]
        );
        setTotal(res.total);
        setPage(res.page);
      } catch {
        setError("Không tải được danh sách bài Speaking. Thử lại nhé.");
        if (replace) setTopics([]);
      }
    },
    [part]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTopics([]);
      setPage(1);
      await fetchPage(1, true);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [part, fetchPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPage(1, true);
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (loading || loadingMore || refreshing) return;
    if (topics.length >= total) return;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: H_PAD,
          paddingTop: 12,
          paddingBottom: 10,
          gap: 8,
        }}
      >
        {PARTS.map((p) => {
          const active = part === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => setPart(p.key)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: active ? PRIMARY : "#fff",
                borderWidth: 1,
                borderColor: active ? PRIMARY : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: active ? "#fff" : "#6B7280",
                }}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            gap: 12,
          }}
        >
          <Text style={{ color: "#6B7280", textAlign: "center" }}>{error}</Text>
          <Pressable
            onPress={onRefresh}
            style={{
              backgroundColor: PRIMARY,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            paddingHorizontal: H_PAD,
            paddingBottom: 40,
            gap: GAP,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={{ paddingTop: 64, alignItems: "center" }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="mic-off-outline" size={28} color="#9CA3AF" />
              </View>
              <Text
                style={{
                  marginTop: 12,
                  color: "#6B7280",
                  fontWeight: "600",
                }}
              >
                Chưa có bài Speaking
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={PRIMARY}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <TopicCard
              topic={item}
              part={part}
              onPress={() => setSelected(item)}
            />
          )}
        />
      )}

      <QuizPickerSheet
        topic={selected}
        part={part}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}
