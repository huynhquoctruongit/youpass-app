import { AxiosAPI } from "./axios-client";
import { AxiosLorvaix } from "./lorvaix-axios-client";
import {
  mergeBandScoreDetail,
  normalizeAnswerStatus,
  normalizePronunciationCorrections,
  type SpeakingGradeResult,
  type SpeakingHighlight,
} from "@/services/helpers/speaking-grade";

export type SpeakingPart = 1 | 2 | 3;
export type SpeakingSubmissionType = "FREE" | "CHARGED";
export type { SpeakingGradeResult };

export interface SpeakingQuiz {
  id: string;
  title: string;
  slug?: string;
  is_submitted?: boolean;
  latest_answer_id?: string;
  answer_id?: string;
  band_score?: number | null;
  latest_answer?: Array<{
    id?: string;
    band_score?: number | null;
    submission_type?: string;
    status?: string;
    marking_stage?: string;
    last_attempted_at?: string;
    extra?: SpeakingAnswerExtra;
  }>;
}

/**
 * Nội dung `extra` trong `latest_answer` mà list API trả về cho quiz đã submit.
 * - overall_status: 1 = đang chấm, 2 = chấm lỗi/thất bại, 3 = chấm xong (có điểm)
 * - overall / FC / PR / LR / GRA: band tổng và từng tiêu chí (0 khi lỗi)
 */
export interface SpeakingAnswerExtra {
  answer_id?: string | number;
  overall?: number | null;
  overall_status?: number;
  FC?: number;
  PR?: number;
  LR?: number;
  GRA?: number;
}

/** overall_status của bài chấm CHARGED (đọc từ latest_answer.extra). */
export const ANSWER_OVERALL_STATUS = {
  GRADING: 1,
  FAILED: 2,
  GRADED: 3,
} as const;

/**
 * Trạng thái hiển thị của một quiz Speaking trên danh sách.
 * - not_started: chưa làm
 * - grading: đã submit nhưng đang chấm (chưa có band, chưa fail)
 * - failed: chấm thất bại
 * - graded: đã chấm xong, có band score
 * - free_saved: đã lưu bản FREE (chỉ transcript, không chấm điểm)
 */
export type SpeakingQuizStatus =
  | "not_started"
  | "free_saved"
  | "grading"
  | "graded"
  | "failed";

export interface SpeakingQuizState {
  status: SpeakingQuizStatus;
  answerId: string | null;
  band: number | null;
}

/** Meta hiển thị (màu/nhãn/icon) cho từng trạng thái quiz. */
export const QUIZ_STATUS_META: Record<
  SpeakingQuizStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: string;
  }
> = {
  not_started: {
    label: "Chưa làm",
    color: "#9CA3AF",
    bg: "#F3F4F6",
    border: "#E5E7EB",
    icon: "ellipse-outline",
  },
  free_saved: {
    label: "Đã lưu (FREE)",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: "bookmark",
  },
  grading: {
    label: "Đang chấm",
    color: "#B45309",
    bg: "#FEF3C7",
    border: "#FDE68A",
    icon: "time",
  },
  graded: {
    label: "Đã làm",
    color: "#059669",
    bg: "#D1FAE5",
    border: "#A7F3D0",
    icon: "checkmark-circle",
  },
  failed: {
    label: "Chấm lỗi",
    color: "#DC2626",
    bg: "#FEE2E2",
    border: "#FCA5A5",
    icon: "alert-circle",
  },
};

export interface SpeakingTopic {
  id: string;
  title: string;
  thumbnail?: string;
  quizzes: SpeakingQuiz[];
  tags?: Array<{ code?: string; title?: string }>;
}

export interface SpeakingTagGroup {
  id?: string;
  code?: string;
  title?: string;
  topics: SpeakingTopic[];
}

export interface SpeakingTopicsResponse {
  topics: SpeakingTopic[];
  total: number;
  page: number;
  page_size: number;
}

export interface SpeakingQuestion {
  id: string | number;
  title?: string;
  description?: string;
  audio_url?: string;
  time_limit?: number;
}

export interface SpeakingQuizDetail {
  id: string;
  title?: string;
  type?: number;
  speaking_part_type?: number;
  questions: SpeakingQuestion[];
  included_vocabs?: unknown[];
}

export interface SpeakingAnswerDetail {
  id: string;
  band_score?: number | null;
  band_score_detail?: Record<string, number> | null;
  latest_upgrade?: unknown;
  review_detail?: {
    review_template?: string;
    id?: string;
  } | null;
  detail?: Array<{
    answer?: {
      transcript?: string;
      file_id?: string;
      raw?: unknown;
    };
  }>;
}

const PAGE_SIZE = 10;
const PRACTICE_DRAFT_FOLDER = "52e5eb68-9da3-4ce6-8142-cc4a1e97180f";

export const SHORT_ANSWER_MIN_WORDS: Record<SpeakingPart, number> = {
  1: 40,
  2: 160,
  3: 60,
};

export const speakingApi = {
  getTopics: async (
    part: SpeakingPart,
    page = 1,
    search?: string
  ): Promise<SpeakingTopicsResponse> => {
    const params: Record<string, string | number> = {
      page_size: PAGE_SIZE,
      page,
      status: "published",
      speaking_part_type: part,
    };
    if (search?.trim()) {
      params.search = search.trim();
      params.mode = 0;
    }

    const res = await AxiosAPI.get("/v1/speaking-topics", { params });
    const data = res.data?.data?.data ?? res.data?.data ?? {};

    return {
      topics: data.topics ?? [],
      total: data.total ?? 0,
      page: data.page ?? page,
      page_size: data.page_size ?? PAGE_SIZE,
    };
  },

  /** Speaking Pro sidebar source — flatten for next-question navigation */
  getTopicsByTag: async (part: SpeakingPart): Promise<SpeakingTagGroup[]> => {
    const res = await AxiosAPI.get("/v1/speaking-topics-by-tag", {
      params: {
        page: 1,
        page_size: 100,
        speaking_part_type: part,
      },
    });
    const data = res.data?.data?.data ?? res.data?.data ?? {};
    return data.tags ?? [];
  },

  getQuizDetail: async (quizId: string): Promise<SpeakingQuizDetail> => {
    const res = await AxiosAPI.get(`/v1/quizzes/${quizId}`, {
      params: { included_vocabs: true },
    });
    const data = res.data?.data?.data ?? res.data?.data ?? {};
    return {
      id: String(data.id ?? quizId),
      title: data.title,
      type: data.type,
      speaking_part_type: data.speaking_part_type,
      questions: data.questions ?? [],
      included_vocabs: data.included_vocabs ?? data.vocabs ?? [],
    };
  },

  getAnswerDetail: async (answerId: string): Promise<SpeakingAnswerDetail> => {
    const res = await AxiosAPI.get(`/v1/answers/${answerId}`);
    const detail = res.data?.data?.data ?? res.data?.data ?? {};
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[SpeakingGrade] answerDetail keys", {
        answerId,
        topLevelKeys: Object.keys(detail || {}),
        band_score: detail?.band_score,
        band_score_detail: detail?.band_score_detail,
        review_detail: detail?.review_detail,
        hasReviewTemplate: !!detail?.review_detail?.review_template,
      });
    }
    return detail;
  },

  /**
   * Lấy danh sách lỗi phát âm cho pipeline "speaking-with-ai"
   * (review_template === "speaking"). Web dùng endpoint này để đổ bảng
   * "Sửa lỗi Phát âm" — dữ liệu KHÔNG nằm trong /answers/{id}/status.highlights.
   */
  getPronunciationCorrections: async (
    answerId: string
  ): Promise<SpeakingHighlight[]> => {
    const res = await AxiosAPI.get("/v1/pronunciation/corrections", {
      params: {
        answer_id: answerId,
        page: 1,
        page_size: 400,
        limit: 100,
      },
    });
    const payload = res.data?.data?.data ?? res.data?.data ?? {};
    const items: any[] = payload.items ?? payload ?? [];
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[SpeakingGrade] pronunciationCorrections", {
        answerId,
        count: Array.isArray(items) ? items.length : 0,
        sample: Array.isArray(items) ? items.slice(0, 2) : items,
      });
    }
    return normalizePronunciationCorrections(items);
  },

  /**
   * Bổ sung lỗi phát âm (từ /pronunciation/corrections) vào grade sau khi bài
   * đã chấm xong. Nếu /status.highlights đã có sẵn lỗi PR thì giữ nguyên,
   * chỉ thêm khi chưa có (pipeline speaking-with-ai không trả PR ở /status).
   */
  enrichWithPronunciation: async (
    answerId: string,
    grade: SpeakingGradeResult
  ): Promise<SpeakingGradeResult> => {
    const alreadyHasPr = (grade.highlights || []).some(
      (item) => item.criterion === "PR"
    );
    if (alreadyHasPr) return grade;
    try {
      const corrections = await speakingApi.getPronunciationCorrections(
        answerId
      );
      if (corrections.length === 0) return grade;
      return {
        ...grade,
        highlights: [...(grade.highlights || []), ...corrections],
      };
    } catch {
      return grade;
    }
  },

  uploadRecording: async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append("folder", PRACTICE_DRAFT_FOLDER);
    formData.append("file", {
      uri,
      type: "audio/m4a",
      name: `speaking-${Date.now()}.m4a`,
    } as unknown as Blob);

    const res = await AxiosAPI.post("/v1/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const fileId = res.data?.data?.id;
    if (!fileId) throw new Error("Upload recording failed: no file_id");
    return String(fileId);
  },

  getTranscript: async (
    quizId: string,
    fileId: string
  ): Promise<{ transcript: string; raw: unknown }> => {
    const res = await AxiosLorvaix.post(
      `/v1/quizzes/${quizId}/speaking/recording`,
      { file_id: fileId }
    );
    const data = res.data?.data ?? res.data ?? {};
    return {
      transcript: data.transcript ?? "",
      raw: data.raw ?? data,
    };
  },

  recordToTranscript: async (
    quizId: string,
    uri: string
  ): Promise<{ fileId: string; transcript: string; raw: unknown }> => {
    const fileId = await speakingApi.uploadRecording(uri);
    const { transcript, raw } = await speakingApi.getTranscript(quizId, fileId);
    return { fileId, transcript, raw };
  },

  submit: async (
    quizId: string,
    payload: {
      questionId: string | number;
      fileId: string;
      transcript: string;
      submissionType: SpeakingSubmissionType;
      raw: unknown;
    }
  ) => {
    const res = await AxiosLorvaix.post(`/v1/quizzes/${quizId}/submit`, {
      type: 8,
      question_id: payload.questionId,
      file_id: payload.fileId,
      transcript: payload.transcript,
      submission_type: payload.submissionType,
      raw: payload.raw,
    });
    return res.data?.data ?? res.data;
  },

  getAnswerStatus: async (answerId: string): Promise<SpeakingGradeResult> => {
    const res = await AxiosLorvaix.get(`/v1/answers/${answerId}/status`);
    return normalizeAnswerStatus(res.data?.data ?? res.data);
  },

  loadGradeResult: async (answerId: string): Promise<SpeakingGradeResult> => {
    const [status, detail] = await Promise.all([
      speakingApi.getAnswerStatus(answerId),
      speakingApi.getAnswerDetail(answerId).catch(() => null),
    ]);
    return mergeBandScoreDetail(
      status,
      detail?.band_score_detail,
      detail?.band_score
    );
  },

  upgradeAnswer: async (answerId: string, criteria: string[]) => {
    const res = await AxiosLorvaix.post(`/v1/answers/${answerId}/upgrade`, {
      criteria,
    });
    return res.data?.data ?? res.data;
  },

  pollGrade: async (
    answerId: string,
    options?: {
      shouldStop?: () => boolean;
      onUpdate?: (status: SpeakingGradeResult) => void;
      maxAttempts?: number;
      intervalMs?: number;
    }
  ): Promise<"graded" | "failed" | "timeout" | "stopped" | "free"> => {
    const maxAttempts = options?.maxAttempts ?? 30;
    const intervalMs = options?.intervalMs ?? 3000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (options?.shouldStop?.()) return "stopped";
      const status = await speakingApi.loadGradeResult(answerId);
      options?.onUpdate?.(status);

      if (
        String(status.submissionType || "").toUpperCase() === "FREE" &&
        !!status.transcript?.trim()
      ) {
        return "free";
      }

      if (status.isFailed) return "failed";
      // QUAN TRỌNG: chỉ coi là "graded" khi status === "reviewed" (giống web).
      // Không dừng sớm chỉ vì đã có band score (overall), vì highlights được
      // sinh ở bước GENERATING_HIGHLIGHTS SAU khi có điểm — dừng sớm sẽ mất lỗi.
      if (status.isReviewed) return "graded";
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return "timeout";
  },
};

export function flattenQuizzesFromTags(tags: SpeakingTagGroup[]): SpeakingQuiz[] {
  const out: SpeakingQuiz[] = [];
  for (const tag of tags) {
    for (const topic of tag.topics ?? []) {
      for (const quiz of topic.quizzes ?? []) {
        out.push({
          ...quiz,
          id: String(quiz.id),
        });
      }
    }
  }
  return out;
}

export function flattenQuizzesFromTopics(topics: SpeakingTopic[]): SpeakingQuiz[] {
  const out: SpeakingQuiz[] = [];
  for (const topic of topics) {
    for (const quiz of topic.quizzes ?? []) {
      out.push({ ...quiz, id: String(quiz.id) });
    }
  }
  return out;
}

/** Lấy answerId khả dĩ từ nhiều field mà API có thể trả về. */
export function extractAnswerId(quiz: SpeakingQuiz): string | null {
  const latest = quiz.latest_answer?.[0];
  const id =
    quiz.answer_id ||
    quiz.latest_answer_id ||
    latest?.extra?.answer_id ||
    latest?.id;
  return id ? String(id) : null;
}

/** Lấy band score khả dĩ từ nhiều field (ưu tiên extra.overall của list API). */
export function extractBand(quiz: SpeakingQuiz): number | null {
  const raw =
    quiz.band_score ??
    quiz.latest_answer?.[0]?.band_score ??
    quiz.latest_answer?.[0]?.extra?.overall;
  const num = raw == null ? NaN : Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Phân loại trạng thái hiển thị của một quiz.
 *
 * Tinh thần "hybrid" (khớp web + nâng cấp có điều kiện):
 * - Web Speaking Pro gốc CHỈ dùng `quiz.is_submitted` → done / todo.
 *   (xem topic-selector.tsx: `quiz.is_submitted ? "done" : "todo"`)
 * - Ở đây ta GIỮ nguyên hành vi đó làm mặc định, đồng thời tự động
 *   nâng cấp lên các trạng thái chi tiết (free_saved / grading / graded /
 *   failed) NẾU backend có trả thêm field trong `latest_answer` / band.
 * - Nếu chỉ có `is_submitted` (đúng như web hiện tại) → coi là "graded"
 *   (đã làm) nhưng band = null nên UI vẫn hiển thị dạng dot "done" gọn gàng.
 */
export function getQuizState(quiz: SpeakingQuiz): SpeakingQuizState {
  const answerId = extractAnswerId(quiz);
  const band = extractBand(quiz);
  const latest = quiz.latest_answer?.[0];
  const extra = latest?.extra;
  const overallStatus = extra?.overall_status;
  const marking = String(latest?.marking_stage ?? "").toUpperCase();
  const submission = String(latest?.submission_type ?? "").toUpperCase();
  const status = String(latest?.status ?? "").toLowerCase();
  const hasDetail = !!latest || band != null;

  // Chưa từng submit và không có answer nào → chưa làm
  if (!quiz.is_submitted && !answerId) {
    return { status: "not_started", answerId: null, band: null };
  }

  // 0) Tín hiệu CHÍNH XÁC từ list API: latest_answer.extra.overall_status
  //    (1 = đang chấm, 2 = chấm lỗi, 3 = chấm xong). Đây là nguồn tin cậy nhất
  //    và là nguyên nhân trước đây bài "đã chấm lỗi" bị kẹt "Đang chấm".
  if (overallStatus != null) {
    if (overallStatus === ANSWER_OVERALL_STATUS.FAILED) {
      return { status: "failed", answerId, band: null };
    }
    if (overallStatus === ANSWER_OVERALL_STATUS.GRADED) {
      return { status: "graded", answerId, band };
    }
    if (overallStatus === ANSWER_OVERALL_STATUS.GRADING) {
      // Đang chấm thật (nhưng FREE thì hiển thị đã lưu FREE).
      return submission === "FREE"
        ? { status: "free_saved", answerId, band: null }
        : { status: "grading", answerId, band: null };
    }
  }

  // Có field chi tiết → phân loại chính xác (fallback khi không có overall_status)
  if (hasDetail) {
    // 1) Đã chấm lỗi → luôn ưu tiên hiển thị "Chấm lỗi", không được kẹt "Đang chấm".
    if (
      marking === "FAILED" ||
      marking === "ERROR" ||
      status === "failed" ||
      status === "error"
    ) {
      return { status: "failed", answerId, band };
    }

    // 2) Đã chấm xong (có band / reviewed / completed) → đã làm.
    if (band != null || status === "reviewed" || marking === "COMPLETED") {
      return { status: "graded", answerId, band };
    }

    // 3) Bản FREE đã lưu (chỉ transcript, không chấm điểm).
    if (submission === "FREE") {
      return { status: "free_saved", answerId, band: null };
    }

    // 4) CHARGED chưa rõ kết quả → đang chấm.
    if (submission === "CHARGED") {
      return { status: "grading", answerId, band: null };
    }
  }

  // Fallback KHỚP WEB: chỉ biết là đã submit → coi như "done"
  // (band null → UI hiển thị dạng đã làm, không có điểm cụ thể)
  return { status: "graded", answerId, band };
}

/**
 * Gộp trạng thái các quiz trong 1 topic để hiển thị tổng quan.
 * `done` khớp cách web đếm (completed = is_submitted): mọi quiz không còn
 * ở trạng thái "not_started" đều tính là đã làm.
 */
export function summarizeTopicStates(quizzes: SpeakingQuiz[]) {
  const states = quizzes.map(getQuizState);
  const total = states.length;
  const done = states.filter((s) => s.status !== "not_started").length;
  const graded = states.filter((s) => s.status === "graded");
  const grading = states.some((s) => s.status === "grading");
  const bestBand = graded.reduce<number | null>((best, s) => {
    if (s.band == null) return best;
    return best == null || s.band > best ? s.band : best;
  }, null);

  // Listing không hiển thị trạng thái lỗi → luôn false, bài chấm lỗi được coi
  // như "đã làm" (vẫn tính vào `done`).
  return { total, done, bestBand, hasGrading: grading, hasFailed: false };
}

export function getNextQuiz(
  quizzes: SpeakingQuiz[],
  currentQuizId: string
): SpeakingQuiz | null {
  const idx = quizzes.findIndex((q) => String(q.id) === String(currentQuizId));
  if (idx < 0 || idx >= quizzes.length - 1) return null;
  return quizzes[idx + 1] ?? null;
}

export function buildSpeakingPracticeUrl(
  part: SpeakingPart,
  quizId: string,
  answerId?: string
): string {
  const domain =
    process.env.EXPO_PUBLIC_ELEARNING_DOMAIN || "https://elearning.youpass.vn";
  const base = `${domain}/practice/speaking-part-${part}/${quizId}`;
  return answerId ? `${base}?answer_id=${answerId}` : base;
}

export function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export { formatBand } from "@/services/helpers/speaking-grade";
