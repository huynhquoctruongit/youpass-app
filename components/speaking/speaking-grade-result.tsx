import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  ALL_GROUP,
  CRITERION_GROUPS,
  buildSegments,
  countHighlights,
  filterHighlights,
  formatBand,
  getCriterion,
  getGroupOfCriterion,
  type CriterionGroupId,
  type SpeakingGradeResult,
  type SpeakingHighlight,
} from "@/services/helpers/speaking-grade";

const PRIMARY = "#F97316";

type Props = {
  grade: SpeakingGradeResult;
  questionTitle?: string;
  questionAudioUrl?: string;
  loading?: boolean;
  onRetry?: () => void;
  onNext?: () => void;
  onPlayQuestion?: () => void;
  readOnly?: boolean;
};

function HighlightDetailModal({
  item,
  visible,
  onClose,
}: {
  item: SpeakingHighlight | null;
  visible: boolean;
  onClose: () => void;
}) {
  const criterion = getCriterion(item?.criterion);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => undefined);
    };
  }, []);

  const playUrl = async (url?: string) => {
    if (!url) return;
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch {
      // ignore
    }
  };

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.45)",
          justifyContent: "center",
          padding: 20,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderRadius: 18,
            padding: 16,
            maxHeight: "70%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
              {criterion?.popoverTitle || "Chi tiết lỗi"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {criterion?.popoverVariant === "pronunciation" ? (
            <View style={{ gap: 10 }}>
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#FECACA",
                  backgroundColor: "#FEF2F2",
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#DC2626" }}>
                  Bạn nói
                </Text>
                <Text style={{ marginTop: 4, color: "#B91C1C" }}>
                  {item.pronunciation?.saidIpa || "--"}
                </Text>
              </View>
              <Pressable
                onPress={() => playUrl(item.pronunciation?.correctAudioUrl)}
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#A7F3D0",
                  backgroundColor: "#ECFDF5",
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#059669" }}>
                  Phát âm đúng
                </Text>
                <Text style={{ marginTop: 4, color: "#047857" }}>
                  {item.pronunciation?.correctIpa || "--"}
                </Text>
              </Pressable>
              {!!item.pronunciation?.word && (
                <Text style={{ color: "#6B7280", fontSize: 13 }}>
                  Từ:{" "}
                  <Text style={{ fontWeight: "700", color: "#111827" }}>
                    {item.pronunciation.word}
                  </Text>
                  {item.pronunciation.wordClass &&
                  item.pronunciation.wordClass !== "other"
                    ? ` · ${item.pronunciation.wordClass}`
                    : ""}
                </Text>
              )}
            </View>
          ) : (
            <View>
              {!!item.why && (
                <Text style={{ fontSize: 14, lineHeight: 22, color: "#374151" }}>
                  {item.why}
                </Text>
              )}
              {!!item.fix && (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  <Text style={{ color: "#6B7280", fontSize: 13 }}>
                    {criterion?.fixLabel}
                  </Text>
                  <Text style={{ color: "#059669", fontWeight: "700", fontSize: 13 }}>
                    {item.fix}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TranscriptWithHighlights({
  transcript,
  highlights,
  groupId,
}: {
  transcript: string;
  highlights: SpeakingHighlight[];
  groupId: CriterionGroupId;
}) {
  const [selected, setSelected] = useState<SpeakingHighlight | null>(null);
  const segments = useMemo(
    () => buildSegments(transcript, filterHighlights(highlights, groupId)),
    [transcript, highlights, groupId]
  );

  return (
    <View>
      <Text style={{ fontSize: 15, lineHeight: 28, color: "#1F2937" }}>
        {segments.map((segment) => {
          if (!segment.item) {
            return <Text key={segment.key}>{segment.text}</Text>;
          }
          const group = getGroupOfCriterion(segment.item.criterion);
          return (
            <Text
              key={segment.key}
              onPress={() => setSelected(segment.item)}
              style={{
                backgroundColor: group?.markBg || "#FEE2E2",
                borderBottomWidth: 2,
                borderBottomColor: group?.markBorder || "#FCA5A5",
                color: "#111827",
                fontWeight: "600",
              }}
            >
              {segment.text}
            </Text>
          );
        })}
      </Text>
      <HighlightDetailModal
        item={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

export function SpeakingGradeResultView({
  grade,
  questionTitle,
  questionAudioUrl,
  loading,
  onRetry,
  onNext,
  onPlayQuestion,
  readOnly,
}: Props) {
  const [tab, setTab] = useState<CriterionGroupId>(ALL_GROUP);
  const [playingAudio, setPlayingAudio] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const highlights = grade.highlights || [];
  const overall = grade.overall;
  const isReviewed = !!grade.isReviewed;
  const isFailed = !!grade.isFailed;
  const isScoringLoading = !isReviewed && !isFailed && overall == null;

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => undefined);
    };
  }, []);

  const playPlayback = async () => {
    const url = grade.audioUrl;
    if (!url) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setPlayingAudio(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setPlayingAudio(false);
      });
    } catch {
      setPlayingAudio(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          padding: 14,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <Pressable
          onPress={onPlayQuestion}
          disabled={!questionAudioUrl && !onPlayQuestion}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
            opacity: questionAudioUrl || onPlayQuestion ? 1 : 0.4,
          }}
        >
          <Ionicons name="volume-high" size={18} color={PRIMARY} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: "700",
            color: "#1F2937",
            lineHeight: 22,
            paddingTop: 6,
          }}
        >
          {questionTitle || "Speaking practice"}
        </Text>
        <View
          style={{
            backgroundColor: "#10B981",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            alignItems: "center",
            minWidth: 84,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
            Overall
          </Text>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
            {isScoringLoading || loading ? "..." : formatBand(overall)}
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          padding: 12,
        }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {grade.scores.map((item) => (
            <View
              key={item.id}
              style={{
                width: "48%",
                flexGrow: 1,
                borderRadius: 12,
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingVertical: 12,
                paddingHorizontal: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>
                {item.label}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#059669",
                }}
              >
                {formatBand(item.score)}
              </Text>
            </View>
          ))}
        </View>
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            gap: 8,
            backgroundColor: "#EFF6FF",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Ionicons name="information-circle" size={16} color="#2563EB" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, lineHeight: 18, color: "#1D4ED8" }}>
            Kết quả chỉ dựa trên một câu trả lời nên chưa thể phản ánh đầy đủ năng lực
            của bạn. Nếu muốn chắc chắn hơn, bạn làm Full đề nhé!
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          overflow: "hidden",
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 10, gap: 8 }}
        >
          {CRITERION_GROUPS.map((group) => {
            const active = tab === group.id;
            const errorCount = countHighlights(highlights, group.id);
            return (
              <Pressable
                key={group.id}
                onPress={() => setTab(group.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: active ? "#FFF7ED" : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: active ? PRIMARY : "#E5E7EB",
                  minWidth: 110,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? PRIMARY : "#4B5563",
                  }}
                  numberOfLines={2}
                >
                  {group.label}
                </Text>
                <View
                  style={{
                    marginTop: 6,
                    alignSelf: "flex-start",
                    backgroundColor: group.badgeBg,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {!isReviewed && !isFailed && (
                    <ActivityIndicator size="small" color={group.badgeText} />
                  )}
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: group.badgeText,
                    }}
                  >
                    {isFailed
                      ? "Lỗi"
                      : isReviewed
                        ? `${errorCount} lỗi`
                        : "Đang chấm"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Bài nói của bạn
          </Text>

          {loading && !grade.transcript ? (
            <View style={{ paddingVertical: 28, alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={{ color: "#6B7280", fontSize: 13 }}>
                Đang tải kết quả chấm bài...
              </Text>
            </View>
          ) : grade.transcript ? (
            <TranscriptWithHighlights
              transcript={grade.transcript}
              highlights={highlights}
              groupId={tab}
            />
          ) : (
            <View
              style={{
                borderRadius: 12,
                backgroundColor: "#FEF2F2",
                padding: 14,
              }}
            >
              <Text style={{ fontWeight: "700", color: "#B91C1C" }}>
                Không nhận được nội dung bài nói
              </Text>
              <Text style={{ marginTop: 6, color: "#7F1D1D", fontSize: 13 }}>
                Bạn vui lòng báo về YouPass, chúng mình sẽ phản hồi sớm nhất!
              </Text>
            </View>
          )}

          {isFailed && !!grade.transcript && (
            <View
              style={{
                marginTop: 12,
                borderRadius: 12,
                backgroundColor: "#FEF2F2",
                padding: 14,
              }}
            >
              <Text style={{ fontWeight: "700", color: "#B91C1C" }}>
                Đã có lỗi xảy ra khi chấm bài
              </Text>
              <Text style={{ marginTop: 6, color: "#7F1D1D", fontSize: 13 }}>
                Bạn vui lòng thử lại hoặc báo về YouPass.
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            padding: 14,
            gap: 12,
          }}
        >
          <Pressable
            onPress={playPlayback}
            disabled={!grade.audioUrl}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: grade.audioUrl ? "#FFF7ED" : "#F3F4F6",
              borderRadius: 12,
              paddingVertical: 12,
              opacity: grade.audioUrl ? 1 : 0.6,
            }}
          >
            <Ionicons
              name={playingAudio ? "pause-circle" : "play-circle"}
              size={22}
              color={grade.audioUrl ? PRIMARY : "#9CA3AF"}
            />
            <Text
              style={{
                fontWeight: "700",
                color: grade.audioUrl ? PRIMARY : "#9CA3AF",
              }}
            >
              {grade.audioUrl
                ? playingAudio
                  ? "Đang phát bài nói..."
                  : "Nghe lại bài nói"
                : "Không có audio"}
            </Text>
          </Pressable>

          {!readOnly && (onRetry || onNext) && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {!!onRetry && (
                <Pressable
                  onPress={onRetry}
                  style={{
                    flex: 1,
                    backgroundColor: "#EFF6FF",
                    borderRadius: 999,
                    paddingVertical: 13,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="mic" size={18} color="#2563EB" />
                  <Text
                    style={{ color: "#2563EB", fontWeight: "700", fontSize: 14 }}
                  >
                    Nói lại
                  </Text>
                </Pressable>
              )}
              {!!onNext && (
                <Pressable
                  onPress={onNext}
                  style={{
                    flex: 1,
                    backgroundColor: PRIMARY,
                    borderRadius: 999,
                    paddingVertical: 13,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}
                  >
                    Câu tiếp theo
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
