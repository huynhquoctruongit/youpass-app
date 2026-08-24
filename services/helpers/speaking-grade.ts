export const ALL_GROUP = "all";

export type CriterionId = "FC" | "PR" | "LR" | "GR";
export type CriterionGroupId = typeof ALL_GROUP | "fluency" | "grammar";

export type SpeakingHighlight = {
  id: string;
  criterion: CriterionId | string;
  start: number;
  end: number;
  why?: string;
  fix?: string;
  pronunciation?: {
    word?: string;
    wordClass?: string;
    saidIpa?: string;
    correctIpa?: string;
    correctAudioUrl?: string;
    audioStart?: number;
    audioEnd?: number;
  } | null;
};

export type SpeakingScoreItem = {
  id: CriterionId;
  label: string;
  fullLabel: string;
  bandKey: string;
  scoreKey: string;
  detailKey: string;
  group: "fluency" | "grammar";
  popoverTitle: string;
  fixLabel: string;
  popoverVariant: "text" | "pronunciation";
  score: number | null;
  detail?: unknown;
};

export type SpeakingGradeResult = {
  answerId: string | null;
  status: string | null;
  submissionType: "FREE" | "CHARGED" | string | null;
  markingStage: string | null;
  currentStep: string | null;
  isReviewed: boolean;
  isFailed: boolean;
  canShowResult: boolean;
  transcript: string;
  audioUrl: string | null;
  overall: number | null;
  scores: SpeakingScoreItem[];
  highlights: SpeakingHighlight[];
};

export const CRITERIA = [
  {
    id: "FC" as const,
    label: "Trôi chảy",
    fullLabel: "Fluency & Coherence",
    scoreKey: "fc_score",
    bandKey: "FC",
    detailKey: "fc_detail",
    group: "fluency" as const,
    popoverTitle: "Lỗi trôi chảy",
    fixLabel: "Sửa lại:",
    popoverVariant: "text" as const,
  },
  {
    id: "PR" as const,
    label: "Phát âm",
    fullLabel: "Pronunciation",
    scoreKey: "pr_score",
    bandKey: "PR",
    detailKey: "pr_detail",
    group: "fluency" as const,
    popoverTitle: "Lỗi phát âm",
    fixLabel: "Phát âm đúng:",
    popoverVariant: "pronunciation" as const,
  },
  {
    id: "LR" as const,
    label: "Từ vựng",
    fullLabel: "Lexical Resource",
    scoreKey: "lr_score",
    bandKey: "LR",
    detailKey: "lr_detail",
    group: "grammar" as const,
    popoverTitle: "Từ vựng",
    fixLabel: "Sửa lại:",
    popoverVariant: "text" as const,
  },
  {
    id: "GR" as const,
    label: "Ngữ pháp",
    fullLabel: "Grammatical Range & Accuracy",
    scoreKey: "gr_score",
    bandKey: "GRA",
    detailKey: "gr_detail",
    group: "grammar" as const,
    popoverTitle: "Ngữ pháp",
    fixLabel: "Sửa lại:",
    popoverVariant: "text" as const,
  },
];

export const CRITERION_GROUPS: Array<{
  id: CriterionGroupId;
  label: string;
  criteria: CriterionId[];
  badgeBg: string;
  badgeText: string;
  markBg: string;
  markBorder: string;
}> = [
  {
    id: ALL_GROUP,
    label: "Tất cả",
    criteria: ["FC", "PR", "LR", "GR"],
    badgeBg: "#FEE2E2",
    badgeText: "#DC2626",
    markBg: "#FEE2E2",
    markBorder: "#FCA5A5",
  },
  {
    id: "fluency",
    label: "Trôi chảy & Phát âm",
    criteria: ["FC", "PR"],
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
    markBg: "#DBEAFE",
    markBorder: "#93C5FD",
  },
  {
    id: "grammar",
    label: "Từ vựng & Ngữ pháp",
    criteria: ["LR", "GR"],
    badgeBg: "#D1FAE5",
    badgeText: "#059669",
    markBg: "#D1FAE5",
    markBorder: "#6EE7B7",
  },
];

export function getCriterion(id?: string) {
  return CRITERIA.find((item) => item.id === id);
}

export function getGroup(id?: string) {
  return CRITERION_GROUPS.find((item) => item.id === id);
}

export function getGroupOfCriterion(criterionId?: string) {
  const criterion = getCriterion(criterionId);
  return getGroup(criterion?.group);
}

export function formatBand(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return "--";
  }
  return Number(score).toFixed(1);
}

export function filterHighlights(
  highlights: SpeakingHighlight[],
  groupId: CriterionGroupId
) {
  const criteria = getGroup(groupId)?.criteria || [];
  return (highlights || []).filter((item) =>
    criteria.includes(item.criterion as CriterionId)
  );
}

export function countHighlights(
  highlights: SpeakingHighlight[],
  groupId: CriterionGroupId
) {
  return filterHighlights(highlights, groupId).length;
}

export type TranscriptSegment = {
  key: string;
  text: string;
  item: SpeakingHighlight | null;
};

export function buildSegments(
  text: string,
  highlights: SpeakingHighlight[]
): TranscriptSegment[] {
  if (!text) return [];
  const bounds = new Set<number>([0, text.length]);
  highlights.forEach((item) => {
    bounds.add(item.start);
    bounds.add(item.end);
  });

  const points = [...bounds].sort((a, b) => a - b);
  const segments: TranscriptSegment[] = [];

  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!;
    const end = points[index + 1]!;
    if (end <= start) continue;

    const covering = highlights.filter(
      (item) => item.start <= start && item.end >= end
    );
    const narrowest = covering.reduce<SpeakingHighlight | null>(
      (best, current) =>
        !best || current.end - current.start < best.end - best.start
          ? current
          : best,
      null
    );
    const item = text.slice(start, end).trim() ? narrowest : null;
    const previous = segments[segments.length - 1];

    if (previous && previous.item === item) {
      previous.text += text.slice(start, end);
    } else {
      segments.push({
        key: `seg-${start}`,
        text: text.slice(start, end),
        item,
      });
    }
  }

  return segments;
}

export function normalizeAnswerStatus(raw: unknown): SpeakingGradeResult {
  const data = ((raw as { data?: Record<string, unknown> })?.data ??
    raw ??
    {}) as Record<string, unknown>;
  const transcript = (data.transcript as string) || "";
  const status = (data.status as string) ?? null;
  const markingStage = (data.marking_stage as string) ?? null;
  const currentStep = (data.current_step as string) ?? null;
  const markingUpper = String(markingStage ?? "").toUpperCase();
  const isReviewed = status === "reviewed";
  const isFailed = markingUpper === "FAILED";
  const canShowResult =
    currentStep === "GENERATING_HIGHLIGHTS" ||
    isReviewed ||
    markingUpper === "COMPLETED";

  const highlights = ((data.highlights as any[]) || [])
    .map((item: any, index: number) => {
      const pr = item.pronunciation_correction;
      return {
        ...item,
        id: String(item.id ?? `hl-${index}`),
        criterion: String(item.criterion || "").toUpperCase(),
        start: Number(item.start),
        end: Number(item.end),
        why: item.why,
        fix: item.fix,
        pronunciation: pr
          ? {
              word: pr.mispronounced_word,
              wordClass: pr.word_class,
              saidIpa: pr.mispronounced_word_ipa,
              correctIpa: pr.corrected_word_ipa,
              correctAudioUrl: pr.corrected_word_audio,
              audioStart: pr.mispronounced_word_time_range?.start_time,
              audioEnd: pr.mispronounced_word_time_range?.end_time,
            }
          : null,
      } as SpeakingHighlight;
    })
    .filter(
      (item) =>
        item.start >= 0 &&
        item.end > item.start &&
        item.end <= transcript.length
    );

  return {
    answerId: (data.answer_id as string | number | null) != null
      ? String(data.answer_id)
      : null,
    status,
    submissionType: (data.submission_type as string) ?? null,
    markingStage,
    currentStep,
    isReviewed,
    isFailed,
    canShowResult,
    transcript,
    audioUrl: (data.audio_playback_url as string) || null,
    overall: (data.overall_band_score as number) ?? null,
    scores: CRITERIA.map((criterion) => ({
      ...criterion,
      score: (data[criterion.scoreKey] as number) ?? null,
      detail: data[criterion.detailKey] ?? null,
    })),
    highlights,
  };
}

export function mergeBandScoreDetail(
  grade: SpeakingGradeResult,
  bandScoreDetail?: Record<string, number> | null,
  overallFromDetail?: number | null
): SpeakingGradeResult {
  if (!bandScoreDetail && overallFromDetail == null) return grade;
  return {
    ...grade,
    overall: overallFromDetail ?? grade.overall,
    scores: grade.scores.map((item) => ({
      ...item,
      score: bandScoreDetail?.[item.bandKey] ?? item.score,
    })),
  };
}
