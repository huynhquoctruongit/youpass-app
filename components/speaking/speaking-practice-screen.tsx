import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SpeakingErrorAnalysis } from "@/components/speaking/speaking-error-analysis";
import { SpeakingGradeResultView } from "@/components/speaking/speaking-grade-result";
import { useAuth } from "@/hooks/use-auth";
import {
  SHORT_ANSWER_MIN_WORDS,
  countWords,
  flattenQuizzesFromTags,
  flattenQuizzesFromTopics,
  formatSeconds,
  getNextQuiz,
  speakingApi,
  type SpeakingGradeResult,
  type SpeakingPart,
  type SpeakingQuestion,
  type SpeakingQuiz,
} from "@/services/api/speaking";

const PRIMARY = "#F97316";

type Phase =
  | "loading"
  | "idle"
  | "recording"
  | "uploading"
  | "transcript"
  | "grading"
  | "graded";

type Props = {
  part: SpeakingPart;
  quizId: string;
  title?: string;
  answerId?: string;
};

function stripHtml(html?: string) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function SpeakingPracticeScreen({
  part,
  quizId,
  title,
  answerId: answerIdProp,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const isPro = !!profile?.user_subscription;

  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<SpeakingQuestion | null>(null);
  const [quizTitle, setQuizTitle] = useState(title ?? "");
  const [error, setError] = useState<string | null>(null);

  const [remaining, setRemaining] = useState(60);
  const [transcript, setTranscript] = useState("");
  const [rawData, setRawData] = useState<unknown>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grade, setGrade] = useState<SpeakingGradeResult | null>(null);
  const [activeAnswerId, setActiveAnswerId] = useState(answerIdProp || "");
  const [uploadError, setUploadError] = useState(false);
  const [transcriptFailed, setTranscriptFailed] = useState(false);
  const [viewingSavedFree, setViewingSavedFree] = useState(false);
  const [savedModalAnswerId, setSavedModalAnswerId] = useState<string | null>(
    null
  );
  const [flatQuizzes, setFlatQuizzes] = useState<SpeakingQuiz[]>([]);
  const [playingLocal, setPlayingLocal] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const cancelledRef = useRef(false);
  const gradeRunRef = useRef(0);
  const selfSubmittedAnswerIdRef = useRef<string | null>(null);
  const autoplayedQuestionIdRef = useRef<string | number | null>(null);
  const finishingRef = useRef(false);
  const audioUriRef = useRef<string | null>(null);

  const timeLimit =
    question?.time_limit && question.time_limit > 0 ? question.time_limit : 60;
  const minWords = SHORT_ANSWER_MIN_WORDS[part];
  const wordCount = countWords(transcript);

  const stopSounds = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => undefined);
        await soundRef.current.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    } catch {
      // ignore
    }
    setPlayingLocal(false);
  };

  const applyLocalAudioFallback = useCallback(
    (status: SpeakingGradeResult): SpeakingGradeResult => {
      if (status.audioUrl || !audioUriRef.current) return status;
      return { ...status, audioUrl: audioUriRef.current };
    },
    []
  );

  /**
   * Sau khi bài đã chấm xong, bổ sung lỗi phát âm từ endpoint riêng
   * (/pronunciation/corrections) cho pipeline speaking-with-ai, vì các lỗi này
   * không nằm trong /answers/{id}/status.highlights.
   */
  const enrichGradeWithPronunciation = useCallback(
    async (
      answerId: string,
      runId: number,
      baseGrade: SpeakingGradeResult
    ) => {
      if (!answerId || !baseGrade) return;
      const enriched = await speakingApi.enrichWithPronunciation(
        answerId,
        baseGrade
      );
      if (cancelledRef.current || gradeRunRef.current !== runId) return;
      if (enriched === baseGrade) return;
      setGrade(applyLocalAudioFallback(enriched));
    },
    [applyLocalAudioFallback]
  );

  const loadNextQuizList = useCallback(async () => {
    try {
      const tags = await speakingApi.getTopicsByTag(part);
      const fromTags = flattenQuizzesFromTags(tags);
      if (fromTags.length > 0) {
        setFlatQuizzes(fromTags);
        return;
      }
    } catch {
      // fallback below
    }
    try {
      const res = await speakingApi.getTopics(part, 1);
      setFlatQuizzes(flattenQuizzesFromTopics(res.topics));
    } catch {
      setFlatQuizzes([]);
    }
  }, [part]);

  /** Chuyển 1 bài FREE đã lưu về màn hình transcript (không hiện UI chấm điểm). */
  const showSavedFree = useCallback(
    (
      status: SpeakingGradeResult | null,
      detailAnswer:
        | { transcript?: string; file_id?: string; raw?: unknown }
        | undefined,
      answerId: string
    ) => {
      const nextGrade = status ? applyLocalAudioFallback(status) : null;
      // FREE không có band score → không set grade để tránh render UI kết quả.
      setGrade(null);
      setTranscript(nextGrade?.transcript || detailAnswer?.transcript || "");
      setFileId(detailAnswer?.file_id ? String(detailAnswer.file_id) : null);
      setRawData(detailAnswer?.raw ?? null);
      setAudioUri(nextGrade?.audioUrl || null);
      audioUriRef.current = nextGrade?.audioUrl || null;
      setActiveAnswerId(answerId);
      setViewingSavedFree(true);
      setPhase("transcript");
    },
    [applyLocalAudioFallback]
  );

  const resumeAnswer = useCallback(
    async (answerId: string, runId: number) => {
      // Giữ ở "loading" (spinner trung tính) cho tới khi biết FREE hay CHARGED,
      // tránh nhấp nháy sang UI kết quả có điểm rồi mới về transcript FREE.
      setPhase("loading");
      setError(null);
      setViewingSavedFree(false);
      setGrade(null);

      // Bước 1: đọc trạng thái + chi tiết 1 lần để xác định loại bài.
      const [firstStatus, detail] = await Promise.all([
        speakingApi.loadGradeResult(answerId).catch(() => null),
        speakingApi.getAnswerDetail(answerId).catch(() => null),
      ]);

      if (cancelledRef.current || gradeRunRef.current !== runId) return;

      const detailAnswer = detail?.detail?.[0]?.answer;
      const isFreeAnswer =
        String(firstStatus?.submissionType || "").toUpperCase() === "FREE";

      // Bài FREE đã lưu (có transcript, chưa chấm) → transcript view ngay.
      if (isFreeAnswer && !!firstStatus?.transcript?.trim()) {
        showSavedFree(firstStatus, detailAnswer, answerId);
        return;
      }

      // Bài đã chấm xong (reviewed → có đủ highlights) → vào thẳng màn kết quả.
      // Lưu ý: KHÔNG short-circuit chỉ vì có overall band, vì highlights được
      // sinh ở bước GENERATING_HIGHLIGHTS sau khi có điểm; phải poll tiếp cho
      // tới khi reviewed mới đủ dữ liệu lỗi (giống web).
      if (firstStatus?.isReviewed) {
        const base = applyLocalAudioFallback(firstStatus);
        setGrade(base);
        setActiveAnswerId(answerId);
        setPhase("graded");
        void enrichGradeWithPronunciation(answerId, runId, base);
        return;
      }
      if (firstStatus?.isFailed) {
        Alert.alert("Chấm bài thất bại", "Bạn thử lại nhé");
        setGrade(applyLocalAudioFallback({ ...firstStatus, isFailed: true }));
        setActiveAnswerId(answerId);
        setPhase("graded");
        return;
      }

      // Bài CHARGED đang được chấm dở → hiện UI chấm điểm và tiếp tục poll.
      setActiveAnswerId(answerId);
      setPhase("grading");
      if (firstStatus) setGrade(applyLocalAudioFallback(firstStatus));

      let latest: SpeakingGradeResult | null = firstStatus;
      const outcome = await speakingApi.pollGrade(answerId, {
        shouldStop: () =>
          cancelledRef.current || gradeRunRef.current !== runId,
        onUpdate: (status) => {
          latest = applyLocalAudioFallback(status);
          setGrade(latest);
        },
      });

      if (cancelledRef.current || gradeRunRef.current !== runId) return;

      if (outcome === "free") {
        // Trường hợp hiếm: bài hoá ra là FREE → chuyển về transcript sạch sẽ.
        const freeDetail =
          detailAnswer ??
          (await speakingApi.getAnswerDetail(answerId).catch(() => null))
            ?.detail?.[0]?.answer;
        if (cancelledRef.current || gradeRunRef.current !== runId) return;
        showSavedFree(latest, freeDetail, answerId);
        return;
      }

      if (outcome === "failed" || outcome === "timeout") {
        Alert.alert("Chấm bài thất bại", "Bạn thử lại nhé");
        setGrade((prev) =>
          prev ? applyLocalAudioFallback({ ...prev, isFailed: true }) : prev
        );
        setPhase("graded");
        return;
      }

      if (outcome === "graded") {
        setPhase("graded");
        if (latest) void enrichGradeWithPronunciation(answerId, runId, latest);
        return;
      }

      setError("Không tải được kết quả Speaking. Thử lại nhé.");
      setPhase("idle");
    },
    [applyLocalAudioFallback, showSavedFree, enrichGradeWithPronunciation]
  );

  const loadQuiz = useCallback(async () => {
    const runId = ++gradeRunRef.current;
    cancelledRef.current = false;
    setPhase("loading");
    setError(null);
    setUploadError(false);
    setTranscriptFailed(false);
    setViewingSavedFree(false);
    setGrade(null);
    setTranscript("");
    setRawData(null);
    setFileId(null);
    setAudioUri(null);
    audioUriRef.current = null;
    setActiveAnswerId(answerIdProp || "");

    void loadNextQuizList();

    try {
      const detail = await speakingApi.getQuizDetail(quizId);
      const q = detail.questions?.[0] ?? null;
      if (!q?.id) {
        setError("Không tìm thấy câu hỏi Speaking.");
        setPhase("idle");
        return;
      }
      setQuestion(q);
      setQuizTitle(detail.title || title || `Speaking Part ${part}`);
      setRemaining(q.time_limit && q.time_limit > 0 ? q.time_limit : 60);

      const resumeId = answerIdProp?.trim();
      if (
        resumeId &&
        selfSubmittedAnswerIdRef.current !== resumeId
      ) {
        setActiveAnswerId(resumeId);
        await resumeAnswer(resumeId, runId);
        return;
      }

      selfSubmittedAnswerIdRef.current = null;
      setPhase("idle");
    } catch {
      setError(
        answerIdProp
          ? "Không tải được kết quả Speaking. Thử lại nhé."
          : "Không tải được đề Speaking. Thử lại nhé."
      );
      setPhase("idle");
    }
  }, [
    answerIdProp,
    loadNextQuizList,
    part,
    quizId,
    resumeAnswer,
    title,
  ]);

  useEffect(() => {
    void loadQuiz();
    return () => {
      cancelledRef.current = true;
      gradeRunRef.current += 1;
      void recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
      void stopSounds();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, answerIdProp, part]);

  useEffect(() => {
    if (phase !== "idle" || !question?.id || !question.audio_url) return;
    if (autoplayedQuestionIdRef.current === question.id) return;
    autoplayedQuestionIdRef.current = question.id;
    void playQuestionAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question?.id, question?.audio_url]);

  useEffect(() => {
    if (phase !== "recording") return;
    if (remaining <= 0) {
      void finishRecording();
      return;
    }
    const timer = setTimeout(() => setRemaining((v) => v - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remaining]);

  const resetAnswer = () => {
    gradeRunRef.current += 1;
    selfSubmittedAnswerIdRef.current = null;
    setTranscript("");
    setRawData(null);
    setFileId(null);
    setAudioUri(null);
    audioUriRef.current = null;
    setGrade(null);
    setLoadingTranscript(false);
    setSaving(false);
    setUploadError(false);
    setTranscriptFailed(false);
    setViewingSavedFree(false);
    setActiveAnswerId("");
    setRemaining(timeLimit);
    setPhase("idle");
    void stopSounds();
  };

  const playQuestionAudio = async () => {
    if (!question?.audio_url) return;
    try {
      await stopSounds();
      const { sound } = await Audio.Sound.createAsync(
        { uri: question.audio_url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch {
      // ignore playback errors
    }
  };

  const playLocalRecording = async () => {
    const uri = audioUri || grade?.audioUrl;
    if (!uri) return;
    try {
      await stopSounds();
      setPlayingLocal(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setPlayingLocal(false);
      });
    } catch {
      setPlayingLocal(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền micro",
          "Hãy cho phép micro để luyện Speaking."
        );
        setPhase("idle");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      await stopSounds();

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRemaining(timeLimit);
      setUploadError(false);
      setTranscriptFailed(false);
      setPhase("recording");
    } catch {
      Alert.alert("Lỗi ghi âm", "Không bắt đầu được ghi âm. Thử lại nhé.");
      setPhase("idle");
    }
  };

  const cancelRecording = async () => {
    finishingRef.current = false;
    try {
      await recordingRef.current?.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    recordingRef.current = null;
    setRemaining(timeLimit);
    setPhase("idle");
  };

  const processRecordingUri = async (uri: string) => {
    setUploadError(false);
    setTranscriptFailed(false);
    setLoadingTranscript(true);
    setTranscript("");
    try {
      const result = await speakingApi.recordToTranscript(quizId, uri);
      if (cancelledRef.current) return;
      setFileId(result.fileId);
      setTranscript(result.transcript || "");
      setRawData(result.raw);
      if (!String(result.transcript || "").trim()) {
        setTranscriptFailed(true);
      }
    } catch {
      if (!cancelledRef.current) {
        setUploadError(true);
        setTranscriptFailed(true);
      }
    } finally {
      if (!cancelledRef.current) setLoadingTranscript(false);
    }
  };

  const finishRecording = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase("uploading");
    try {
      const recording = recordingRef.current;
      if (!recording) throw new Error("No recording");
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error("Missing uri");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      setAudioUri(uri);
      audioUriRef.current = uri;
      setPhase("transcript");
      await processRecordingUri(uri);
    } catch {
      if (!cancelledRef.current) {
        Alert.alert("Lỗi", "Không xử lý được bản ghi âm. Thử lại nhé.");
        setPhase("idle");
      }
    } finally {
      finishingRef.current = false;
    }
  };

  const retryUpload = async () => {
    if (!audioUri) return;
    setPhase("transcript");
    await processRecordingUri(audioUri);
  };

  const saveFree = async () => {
    if (!question?.id || !fileId || !transcript.trim() || saving) return;
    setSaving(true);
    try {
      const result = await speakingApi.submit(quizId, {
        questionId: question.id,
        fileId,
        transcript,
        submissionType: "FREE",
        raw: rawData,
      });
      const nextAnswerId = String(result?.answer_id ?? result?.id ?? "");
      if (nextAnswerId) {
        setActiveAnswerId(nextAnswerId);
        setSavedModalAnswerId(nextAnswerId);
      } else {
        Alert.alert("Đã lưu", "Bài nói FREE đã được lưu.");
      }
      // Stay in transcript phase (FREE does not grade)
      setPhase("transcript");
    } catch {
      Alert.alert("Lỗi", "Lưu bài thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const gradeCharged = async () => {
    if (!question?.id || !fileId || !transcript.trim()) return;
    if (!isPro) {
      Alert.alert(
        "Cần YouPass PRO",
        "Chấm bài Speaking AI yêu cầu gói PRO. Bạn có thể Lưu bài nói (FREE) trước."
      );
      return;
    }

    const runId = ++gradeRunRef.current;
    setPhase("grading");
    setGrade(null);
    setViewingSavedFree(false);
    try {
      const result = await speakingApi.submit(quizId, {
        questionId: question.id,
        fileId,
        transcript,
        submissionType: "CHARGED",
        raw: rawData,
      });
      const nextAnswerId = String(result?.answer_id ?? result?.id ?? "");
      if (!nextAnswerId) throw new Error("Missing answer id");
      selfSubmittedAnswerIdRef.current = nextAnswerId;
      setActiveAnswerId(nextAnswerId);

      let latest: SpeakingGradeResult | null = null;
      const outcome = await speakingApi.pollGrade(nextAnswerId, {
        shouldStop: () =>
          cancelledRef.current || gradeRunRef.current !== runId,
        onUpdate: (status) => {
          latest = applyLocalAudioFallback(status);
          setGrade(latest);
        },
      });

      if (cancelledRef.current || gradeRunRef.current !== runId) return;

      if (outcome === "graded" || outcome === "failed") {
        if (outcome === "failed") {
          Alert.alert("Chấm bài thất bại", "Bạn thử lại nhé");
        }
        setPhase("graded");
        if (outcome === "graded" && latest) {
          void enrichGradeWithPronunciation(nextAnswerId, runId, latest);
        }
      } else if (outcome === "timeout") {
        Alert.alert("Chấm bài thất bại", "Bạn thử lại nhé");
        setGrade((prev) =>
          prev ? applyLocalAudioFallback({ ...prev, isFailed: true }) : prev
        );
        setPhase("graded");
      } else if (outcome === "free") {
        setViewingSavedFree(true);
        setPhase("transcript");
      } else {
        setPhase("transcript");
      }
    } catch (e: any) {
      if (!cancelledRef.current && gradeRunRef.current === runId) {
        Alert.alert(
          "Lỗi",
          e?.response?.data?.message || "Chấm bài thất bại."
        );
        setPhase("transcript");
      }
    }
  };

  const goNextQuestion = () => {
    const next = getNextQuiz(flatQuizzes, quizId);
    if (!next) {
      Alert.alert("Hoàn thành", "Bạn đã làm hết các câu hỏi trong danh sách.");
      return;
    }
    gradeRunRef.current += 1;
    router.replace({
      pathname: "/speaking-practice/[part]/[quizId]",
      params: {
        part: String(part),
        quizId: String(next.id),
        title: next.title || quizTitle,
      },
    });
  };

  const questionText = stripHtml(question?.title) || quizTitle;
  const descriptionText = stripHtml(question?.description);
  const showTranscriptActions =
    phase === "transcript" &&
    !loadingTranscript &&
    !!transcript.trim() &&
    !uploadError;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF7ED" }}>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: 10,
          paddingHorizontal: 12,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F8FAFC",
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}
          >
            {quizTitle || `Speaking Part ${part}`}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>
            Part {part}
            {phase === "grading"
              ? " · Đang chấm bài..."
              : viewingSavedFree
                ? " · Bài FREE đã lưu"
                : grade?.isFailed
                  ? " · Chấm lỗi"
                  : grade?.overall != null
                    ? ` · Band ${grade.overall}`
                    : activeAnswerId
                      ? ` · #${activeAnswerId}`
                      : ""}
          </Text>
        </View>
      </View>

      {phase === "loading" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : error && !grade ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            gap: 12,
          }}
        >
          <Text style={{ color: "#64748B", textAlign: "center" }}>{error}</Text>
          <Pressable
            onPress={loadQuiz}
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
      ) : phase === "grading" || phase === "graded" ? (
        grade ? (
          <SpeakingGradeResultView
            grade={applyLocalAudioFallback(grade)}
            questionTitle={questionText}
            questionAudioUrl={question?.audio_url}
            loading={phase === "grading"}
            onPlayQuestion={playQuestionAudio}
            onRetry={() => {
              setActiveAnswerId("");
              resetAnswer();
            }}
            onNext={goNextQuestion}
            readOnly={phase === "grading"}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={{ color: "#6B7280" }}>Đang tải kết quả chấm bài...</Text>
          </View>
        )
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 28,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 18,
              minHeight: 420,
              shadowColor: "#0F172A",
              shadowOpacity: 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            {(phase === "idle" ||
              phase === "recording" ||
              phase === "uploading" ||
              phase === "transcript") && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <Pressable
                  onPress={playQuestionAudio}
                  disabled={!question?.audio_url}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: question?.audio_url ? 1 : 0.4,
                  }}
                >
                  <Ionicons name="volume-high" size={18} color={PRIMARY} />
                </Pressable>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 17,
                    fontWeight: "700",
                    color: "#1F2937",
                    lineHeight: 24,
                  }}
                >
                  {questionText}
                </Text>
              </View>
            )}

            {!!descriptionText &&
              (phase === "idle" ||
                phase === "recording" ||
                phase === "uploading") && (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#4B5563",
                    lineHeight: 22,
                    marginBottom: 16,
                  }}
                >
                  {descriptionText}
                </Text>
              )}

            {phase === "transcript" && (
              <View style={{ marginBottom: 16 }}>
                {/* Banner phân biệt: đang xem bài FREE đã lưu */}
                {viewingSavedFree && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: "#EFF6FF",
                      borderColor: "#BFDBFE",
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="bookmark" size={16} color="#2563EB" />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 12,
                        lineHeight: 17,
                        color: "#1D4ED8",
                      }}
                    >
                      Đây là bài nói FREE đã lưu (chưa chấm điểm). Bấm{" "}
                      <Text style={{ fontWeight: "800" }}>Chấm bài</Text> để nhận
                      band score.
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#111827",
                    }}
                  >
                    Bài nói của bạn
                  </Text>
                  {!!audioUri && !loadingTranscript && (
                    <Pressable
                      onPress={playLocalRecording}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Ionicons
                        name={playingLocal ? "pause-circle" : "play-circle"}
                        size={18}
                        color={PRIMARY}
                      />
                      <Text style={{ color: PRIMARY, fontWeight: "600", fontSize: 12 }}>
                        {playingLocal ? "Đang phát" : "Nghe lại"}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {loadingTranscript ? (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: 24,
                      gap: 10,
                    }}
                  >
                    <ActivityIndicator color={PRIMARY} />
                    <Text style={{ color: "#6B7280", fontSize: 13 }}>
                      Đang chuyển bài nói thành văn bản...
                    </Text>
                  </View>
                ) : uploadError ? (
                  <View
                    style={{
                      borderRadius: 12,
                      backgroundColor: "#FEF2F2",
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: "#B91C1C" }}>
                      Upload / transcript thất bại
                    </Text>
                    <Text style={{ color: "#7F1D1D", fontSize: 13 }}>
                      Bạn có thể thử upload lại bản ghi hoặc nói lại.
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={retryUpload}
                        style={{
                          backgroundColor: PRIMARY,
                          borderRadius: 999,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          Thử lại upload
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={resetAnswer}
                        style={{
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: "#FCA5A5",
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: "#B91C1C", fontWeight: "700" }}>
                          Nói lại
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : transcriptFailed || !transcript.trim() ? (
                  <View
                    style={{
                      borderRadius: 12,
                      backgroundColor: "#FEF2F2",
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: "#B91C1C" }}>
                      Không nhận được nội dung bài nói
                    </Text>
                    <Text style={{ color: "#7F1D1D", fontSize: 13 }}>
                      Hãy nói lại rõ hơn hoặc thử lại.
                    </Text>
                    <Pressable
                      onPress={resetAnswer}
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: PRIMARY,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        Nói lại
                      </Text>
                    </Pressable>
                  </View>
                ) : grade?.highlights?.length ? (
                  <>
                    <SpeakingErrorAnalysis
                      transcript={transcript || grade.transcript}
                      highlights={grade.highlights}
                      recordingUrl={grade.audioUrl || audioUri}
                    />
                    {wordCount < minWords && (
                      <Text
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: "#B45309",
                        }}
                      >
                        Gợi ý: Part {part} nên nói khoảng {minWords}+ từ (hiện{" "}
                        {wordCount} từ).
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        fontSize: 15,
                        color: "#374151",
                        lineHeight: 24,
                      }}
                    >
                      {transcript}
                    </Text>
                    {wordCount < minWords && (
                      <Text
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: "#B45309",
                        }}
                      >
                        Gợi ý: Part {part} nên nói khoảng {minWords}+ từ (hiện{" "}
                        {wordCount} từ).
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={{ marginTop: "auto", alignItems: "center", gap: 12 }}>
              {phase === "idle" && (
                <Pressable
                  onPress={startRecording}
                  style={{
                    backgroundColor: PRIMARY,
                    borderRadius: 999,
                    paddingHorizontal: 22,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="mic" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    Bắt đầu ghi âm
                  </Text>
                </Pressable>
              )}

              {phase === "recording" && (
                <>
                  <Text style={{ color: "#374151", fontSize: 14 }}>
                    Thời gian còn lại{" "}
                    <Text style={{ fontWeight: "800", color: "#059669" }}>
                      {formatSeconds(remaining)}
                    </Text>
                  </Text>
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: PRIMARY,
                      opacity: 0.9,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <Pressable
                      onPress={cancelRecording}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#fff",
                      }}
                    >
                      <Ionicons name="close" size={18} color="#111827" />
                    </Pressable>
                    <Pressable
                      onPress={finishRecording}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: PRIMARY,
                        backgroundColor: "#FFF7ED",
                        paddingHorizontal: 18,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          backgroundColor: PRIMARY,
                        }}
                      />
                      <Text style={{ color: PRIMARY, fontWeight: "700" }}>
                        Xong
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              {phase === "uploading" && (
                <View style={{ alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color={PRIMARY} />
                  <Text style={{ color: "#6B7280" }}>
                    Đang xử lý file ghi âm...
                  </Text>
                </View>
              )}

              {showTranscriptActions && (
                <View
                  style={{
                    width: "100%",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Pressable
                    onPress={resetAnswer}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 999,
                      backgroundColor: "#EFF6FF",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="mic" size={16} color="#2563EB" />
                    <Text style={{ color: "#2563EB", fontWeight: "700" }}>
                      Nói lại
                    </Text>
                  </Pressable>

                  {!viewingSavedFree && (
                    <Pressable
                      onPress={saveFree}
                      disabled={saving || !fileId}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: PRIMARY,
                        opacity: saving || !fileId ? 0.6 : 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={{ color: PRIMARY, fontWeight: "700" }}>
                        {saving ? "Đang lưu..." : "Lưu bài nói"}
                      </Text>
                      <View
                        style={{
                          backgroundColor: "#2563EB",
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: "800",
                          }}
                        >
                          FREE
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={gradeCharged}
                    disabled={!fileId}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 999,
                      backgroundColor: PRIMARY,
                      opacity: fileId ? 1 : 0.6,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {!isPro && (
                      <Ionicons name="lock-closed" size={14} color="#fff" />
                    )}
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      Chấm bài
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: PRIMARY,
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        PRO
                      </Text>
                    </View>
                  </Pressable>

                  {viewingSavedFree && (
                    <Pressable
                      onPress={goNextQuestion}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderRadius: 999,
                        backgroundColor: "#ECFDF5",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={{ color: "#059669", fontWeight: "700" }}>
                        Câu tiếp theo
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#059669" />
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      <Modal
        visible={!!savedModalAnswerId}
        transparent
        animationType="fade"
        onRequestClose={() => setSavedModalAnswerId(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.45)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setSavedModalAnswerId(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: 18,
              padding: 20,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827" }}>
              Đã lưu bài nói
            </Text>
            <Text style={{ color: "#4B5563", lineHeight: 20 }}>
              Bài FREE đã được lưu
              {savedModalAnswerId ? ` (#${savedModalAnswerId})` : ""}. Bạn vẫn
              có thể Chấm bài (PRO) hoặc Nói lại.
            </Text>
            <Pressable
              onPress={() => setSavedModalAnswerId(null)}
              style={{
                marginTop: 4,
                backgroundColor: PRIMARY,
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Đóng</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
