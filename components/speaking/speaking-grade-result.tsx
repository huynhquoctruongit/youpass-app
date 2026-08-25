import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SpeakingErrorAnalysis } from "@/components/speaking/speaking-error-analysis";
import {
  formatBand,
  type SpeakingGradeResult,
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

      {loading && !grade.transcript ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            paddingVertical: 28,
            alignItems: "center",
            gap: 8,
          }}
        >
          <ActivityIndicator color={PRIMARY} />
          <Text style={{ color: "#6B7280", fontSize: 13 }}>
            Đang tải kết quả chấm bài...
          </Text>
        </View>
      ) : (
        <SpeakingErrorAnalysis
          transcript={grade.transcript}
          highlights={highlights}
          scoring={!isReviewed && !isFailed}
          failed={isFailed}
          recordingUrl={grade.audioUrl}
        />
      )}

      {isFailed && !!grade.transcript && (
        <View
          style={{
            borderRadius: 16,
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

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          overflow: "hidden",
        }}
      >
        <View
          style={{
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
