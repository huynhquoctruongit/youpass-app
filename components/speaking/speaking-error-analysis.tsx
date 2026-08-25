import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  ALL_GROUP,
  CRITERION_GROUPS,
  buildSegments,
  countHighlights,
  filterHighlights,
  getCriterion,
  getGroupOfCriterion,
  type CriterionGroupId,
  type SpeakingHighlight,
} from "@/services/helpers/speaking-grade";

const PRIMARY = "#F97316";

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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
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
    () =>
      buildSegments(
        transcript,
        // Bỏ các highlight không có vị trí trong transcript (start < 0),
        // ví dụ lỗi phát âm từ /pronunciation/corrections chỉ hiện ở bảng.
        filterHighlights(highlights, groupId).filter((item) => item.start >= 0)
      ),
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

/** Lấy từ được highlight từ transcript theo start/end. */
function sliceWord(transcript: string, item: SpeakingHighlight): string {
  return transcript.slice(item.start, item.end).trim();
}

/** Bảng "Sửa lỗi Phát âm" (Từ / Bạn nói lỗi / Cách nói đúng) như UI web. */
function PronunciationErrorTable({
  items,
  transcript,
  recordingUrl,
}: {
  items: SpeakingHighlight[];
  transcript: string;
  recordingUrl?: string | null;
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingRangeId, setPlayingRangeId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      void soundRef.current?.unloadAsync().catch(() => undefined);
    };
  }, []);

  const ensurePlaybackMode = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  };

  const stopCurrent = async () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }
  };

  /** Phát 1 đoạn của bản ghi âm gốc theo time range (cột "Bạn nói lỗi"). */
  const playRange = async (item: SpeakingHighlight) => {
    const pr = item.pronunciation;
    if (!recordingUrl || pr?.audioStart == null) return;
    try {
      await ensurePlaybackMode();
      await stopCurrent();
      setPlayingRangeId(item.id);
      const startMs = Math.max(0, Math.floor((pr.audioStart ?? 0) * 1000));
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUrl },
        { shouldPlay: true, positionMillis: startMs }
      );
      soundRef.current = sound;
      const durationMs =
        pr.audioEnd != null
          ? Math.max(200, Math.floor((pr.audioEnd - (pr.audioStart ?? 0)) * 1000))
          : 1500;
      stopTimerRef.current = setTimeout(() => {
        void soundRef.current?.pauseAsync().catch(() => undefined);
        setPlayingRangeId(null);
      }, durationMs);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setPlayingRangeId(null);
      });
    } catch {
      setPlayingRangeId(null);
    }
  };

  const play = async (url?: string) => {
    if (!url) return;
    try {
      // iOS: đảm bảo phát được cả khi máy đang bật chuông im lặng.
      await ensurePlaybackMode();
      await stopCurrent();
      setPlayingRangeId(null);
      setPlayingUrl(url);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setPlayingUrl(null);
      });
    } catch {
      setPlayingUrl(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
          Sửa lỗi Phát âm
        </Text>
      </View>

      {/* Header 3 cột */}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        }}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#F8FAFC",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF" }}>
            Từ
          </Text>
        </View>
        <View
          style={{
            flex: 1.1,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#FEF2F2",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#DC2626" }}>
            Bạn nói lỗi
          </Text>
        </View>
        <View
          style={{
            flex: 1.1,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#ECFDF5",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669" }}>
            Cách nói đúng
          </Text>
        </View>
      </View>

      {items.map((item, index) => {
        const pr = item.pronunciation;
        const word = pr?.word || sliceWord(transcript, item) || "--";
        const isPlaying = !!pr?.correctAudioUrl && playingUrl === pr.correctAudioUrl;
        const canPlayRange = !!recordingUrl && pr?.audioStart != null;
        const isPlayingRange = playingRangeId === item.id;
        return (
          <View
            key={item.id}
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderTopColor: "#F1F5F9",
              backgroundColor: index % 2 === 1 ? "#FCFCFD" : "#fff",
            }}
          >
            {/* Từ */}
            <View
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingVertical: 14,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
                {word}
              </Text>
            </View>

            {/* Bạn nói lỗi (bấm để nghe lại đoạn bạn nói từ bản ghi âm) */}
            <Pressable
              onPress={() => playRange(item)}
              disabled={!canPlayRange}
              style={{
                flex: 1.1,
                paddingHorizontal: 12,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons
                name={isPlayingRange ? "pause" : "volume-medium"}
                size={16}
                color={canPlayRange ? "#DC2626" : "#9CA3AF"}
              />
              <Text style={{ fontSize: 14, color: "#B91C1C", flexShrink: 1 }}>
                {pr?.saidIpa || "--"}
              </Text>
            </Pressable>

            {/* Cách nói đúng */}
            <View
              style={{
                flex: 1.1,
                paddingHorizontal: 12,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Pressable
                onPress={() => play(pr?.correctAudioUrl)}
                disabled={!pr?.correctAudioUrl}
                hitSlop={8}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: pr?.correctAudioUrl ? "#D1FAE5" : "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "volume-high"}
                  size={16}
                  color={pr?.correctAudioUrl ? "#059669" : "#9CA3AF"}
                />
              </Pressable>
              <Text style={{ fontSize: 14, color: "#047857", flexShrink: 1 }}>
                {pr?.correctIpa || "--"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Danh sách lỗi FC/LR/GR dạng card (vì sao / sửa lại). */
function OtherErrorList({
  items,
  transcript,
}: {
  items: SpeakingHighlight[];
  transcript: string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => {
        const criterion = getCriterion(item.criterion);
        const group = getGroupOfCriterion(item.criterion);
        const word = sliceWord(transcript, item);
        return (
          <View
            key={item.id}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              padding: 12,
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <View
                style={{
                  backgroundColor: group?.badgeBg || "#FEE2E2",
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: group?.badgeText || "#DC2626",
                  }}
                >
                  {criterion?.label || "Lỗi"}
                </Text>
              </View>
              {!!word && (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#111827",
                    textDecorationLine: "line-through",
                    textDecorationColor: "#F87171",
                  }}
                >
                  {word}
                </Text>
              )}
            </View>

            {!!item.why && (
              <Text style={{ fontSize: 13, lineHeight: 20, color: "#374151" }}>
                {item.why}
              </Text>
            )}
            {!!item.fix && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#6B7280", fontSize: 13 }}>
                  {criterion?.fixLabel || "Sửa lại:"}
                </Text>
                <Text
                  style={{ color: "#059669", fontWeight: "700", fontSize: 13 }}
                >
                  {item.fix}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

type Props = {
  transcript: string;
  highlights: SpeakingHighlight[];
  /** Đang chấm (chưa xong) → hiện spinner "Đang chấm" ở badge. */
  scoring?: boolean;
  /** Chấm thất bại → badge hiện "Lỗi". */
  failed?: boolean;
  /** Tiêu đề khối. Mặc định: "Bài nói của bạn". */
  title?: string;
  /** URL bản ghi âm của user, để phát lại đoạn "Bạn nói lỗi" theo time range. */
  recordingUrl?: string | null;
};

/**
 * Khối phân tích lỗi dùng chung: tab nhóm tiêu chí (đếm lỗi) +
 * transcript có highlight lỗi + modal chi tiết lỗi.
 * Dùng ở cả màn Kết quả và màn Transcript (khi đã có highlights).
 */
export function SpeakingErrorAnalysis({
  transcript,
  highlights,
  scoring,
  failed,
  title = "Bài nói của bạn",
  recordingUrl,
}: Props) {
  const [tab, setTab] = useState<CriterionGroupId>(ALL_GROUP);
  const isReviewed = !scoring && !failed;

  // Lỗi thuộc tab đang chọn, tách phát âm (PR) ra bảng riêng.
  const tabHighlights = useMemo(
    () => filterHighlights(highlights, tab),
    [highlights, tab]
  );
  const pronunciationErrors = useMemo(
    () => tabHighlights.filter((item) => item.criterion === "PR"),
    [tabHighlights]
  );
  const otherErrors = useMemo(
    () => tabHighlights.filter((item) => item.criterion !== "PR"),
    [tabHighlights]
  );
  const hasErrors = tabHighlights.length > 0;

  return (
    <View>
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 10, gap: 8 }}>
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
                  flexGrow: 1,
                  minWidth: 100,
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
                  {scoring && (
                    <ActivityIndicator size="small" color={group.badgeText} />
                  )}
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: group.badgeText,
                    }}
                  >
                    {failed
                      ? "Lỗi"
                      : isReviewed
                        ? `${errorCount} lỗi`
                        : "Đang chấm"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#111827",
              marginBottom: 8,
            }}
          >
            {title}
          </Text>

          {transcript ? (
            <TranscriptWithHighlights
              transcript={transcript}
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

          {/* Danh sách lỗi inline theo tab đang chọn */}
          {isReviewed && !!transcript && (
            <View style={{ marginTop: 14, gap: 12 }}>
              {pronunciationErrors.length > 0 && (
                <PronunciationErrorTable
                  items={pronunciationErrors}
                  transcript={transcript}
                  recordingUrl={recordingUrl}
                />
              )}
              {otherErrors.length > 0 && (
                <OtherErrorList items={otherErrors} transcript={transcript} />
              )}
              {!hasErrors && (
                <View
                  style={{
                    borderRadius: 12,
                    backgroundColor: "#ECFDF5",
                    borderWidth: 1,
                    borderColor: "#A7F3D0",
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={{ flex: 1, color: "#047857", fontSize: 13 }}>
                    Không phát hiện lỗi ở mục này. Làm tốt lắm!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
