import {
  buildSegments,
  countHighlights,
  filterHighlights,
  formatBand,
  getGroupOfCriterion,
  mergeBandScoreDetail,
  normalizeAnswerStatus,
  type SpeakingGradeResult,
  type SpeakingHighlight,
} from "@/services/helpers/speaking-grade";

describe("formatBand", () => {
  it("formats numbers to 1 decimal", () => {
    expect(formatBand(6)).toBe("6.0");
    expect(formatBand(6.5)).toBe("6.5");
  });
  it("returns -- for null/undefined/NaN", () => {
    expect(formatBand(null)).toBe("--");
    expect(formatBand(undefined)).toBe("--");
    expect(formatBand(NaN)).toBe("--");
  });
});

describe("normalizeAnswerStatus", () => {
  it("normalizes a reviewed CHARGED answer with scores + highlights", () => {
    const raw = {
      data: {
        answer_id: 42,
        status: "reviewed",
        submission_type: "CHARGED",
        marking_stage: "COMPLETED",
        current_step: "DONE",
        transcript: "I like cats very much",
        audio_playback_url: "https://audio/x.mp3",
        overall_band_score: 6.5,
        fc_score: 6,
        pr_score: 7,
        lr_score: 6.5,
        gr_score: 6,
        highlights: [
          {
            id: "h1",
            criterion: "fc",
            start: 2,
            end: 6,
            why: "vague",
            fix: "enjoy",
          },
        ],
      },
    };
    const g = normalizeAnswerStatus(raw);
    expect(g.answerId).toBe("42");
    expect(g.isReviewed).toBe(true);
    expect(g.isFailed).toBe(false);
    expect(g.canShowResult).toBe(true);
    expect(g.overall).toBe(6.5);
    expect(g.audioUrl).toBe("https://audio/x.mp3");
    expect(g.scores.map((s) => s.score)).toEqual([6, 7, 6.5, 6]);
    // criterion uppercased
    expect(g.highlights[0].criterion).toBe("FC");
  });

  it("marks isFailed when marking_stage FAILED", () => {
    const g = normalizeAnswerStatus({ data: { marking_stage: "FAILED" } });
    expect(g.isFailed).toBe(true);
  });

  it("canShowResult true at GENERATING_HIGHLIGHTS step", () => {
    const g = normalizeAnswerStatus({
      data: { current_step: "GENERATING_HIGHLIGHTS" },
    });
    expect(g.canShowResult).toBe(true);
  });

  it("filters out-of-range highlights", () => {
    const g = normalizeAnswerStatus({
      data: {
        transcript: "hello", // length 5
        highlights: [
          { criterion: "FC", start: 0, end: 3 }, // valid
          { criterion: "FC", start: 3, end: 99 }, // end > length -> drop
          { criterion: "FC", start: 4, end: 4 }, // end == start -> drop
          { criterion: "FC", start: -1, end: 2 }, // start < 0 -> drop
        ],
      },
    });
    expect(g.highlights).toHaveLength(1);
    expect(g.highlights[0].end).toBe(3);
  });

  it("maps pronunciation_correction into pronunciation object", () => {
    const g = normalizeAnswerStatus({
      data: {
        transcript: "banana bread",
        highlights: [
          {
            criterion: "PR",
            start: 0,
            end: 6,
            pronunciation_correction: {
              mispronounced_word: "banana",
              word_class: "noun",
              mispronounced_word_ipa: "b@'na:n@",
              corrected_word_ipa: "b@'nA:n@",
              corrected_word_audio: "https://a/b.mp3",
              mispronounced_word_time_range: { start_time: 1, end_time: 2 },
            },
          },
        ],
      },
    });
    expect(g.highlights[0].pronunciation).toEqual({
      word: "banana",
      wordClass: "noun",
      saidIpa: "b@'na:n@",
      correctIpa: "b@'nA:n@",
      correctAudioUrl: "https://a/b.mp3",
      audioStart: 1,
      audioEnd: 2,
    });
  });

  it("handles empty/unknown payload defensively", () => {
    const g = normalizeAnswerStatus(undefined);
    expect(g.answerId).toBeNull();
    expect(g.transcript).toBe("");
    expect(g.overall).toBeNull();
    expect(g.highlights).toEqual([]);
  });
});

describe("mergeBandScoreDetail", () => {
  const base: SpeakingGradeResult = normalizeAnswerStatus({
    data: { transcript: "x", overall_band_score: null },
  });

  it("returns grade unchanged when no detail provided", () => {
    expect(mergeBandScoreDetail(base)).toBe(base);
  });

  it("overrides overall and per-criterion band from detail", () => {
    const merged = mergeBandScoreDetail(
      base,
      { FC: 6, PR: 7, LR: 6.5, GRA: 6 },
      6.5
    );
    expect(merged.overall).toBe(6.5);
    const byId = Object.fromEntries(merged.scores.map((s) => [s.id, s.score]));
    expect(byId.FC).toBe(6);
    expect(byId.PR).toBe(7);
    expect(byId.LR).toBe(6.5);
    expect(byId.GR).toBe(6); // GR maps from bandKey "GRA"
  });
});

describe("buildSegments", () => {
  it("returns empty for empty text", () => {
    expect(buildSegments("", [])).toEqual([]);
  });

  it("returns single plain segment when no highlights", () => {
    const segs = buildSegments("hello world", []);
    expect(segs).toHaveLength(1);
    expect(segs[0].item).toBeNull();
    expect(segs[0].text).toBe("hello world");
  });

  it("splits text around a highlight span", () => {
    const hl: SpeakingHighlight[] = [
      { id: "h", criterion: "FC", start: 6, end: 11 },
    ];
    const segs = buildSegments("hello world", hl);
    const texts = segs.map((s) => s.text);
    expect(texts.join("")).toBe("hello world");
    const highlighted = segs.find((s) => s.item);
    expect(highlighted?.text).toBe("world");
  });
});

describe("filterHighlights / countHighlights", () => {
  const hls: SpeakingHighlight[] = [
    { id: "1", criterion: "FC", start: 0, end: 1 },
    { id: "2", criterion: "PR", start: 1, end: 2 },
    { id: "3", criterion: "LR", start: 2, end: 3 },
    { id: "4", criterion: "GR", start: 3, end: 4 },
  ];

  it("all group keeps everything", () => {
    expect(countHighlights(hls, "all")).toBe(4);
  });
  it("fluency = FC + PR", () => {
    expect(filterHighlights(hls, "fluency").map((h) => h.criterion)).toEqual([
      "FC",
      "PR",
    ]);
  });
  it("grammar = LR + GR", () => {
    expect(countHighlights(hls, "grammar")).toBe(2);
  });
});

describe("getGroupOfCriterion", () => {
  it("maps FC/PR to fluency and LR/GR to grammar", () => {
    expect(getGroupOfCriterion("FC")?.id).toBe("fluency");
    expect(getGroupOfCriterion("PR")?.id).toBe("fluency");
    expect(getGroupOfCriterion("LR")?.id).toBe("grammar");
    expect(getGroupOfCriterion("GR")?.id).toBe("grammar");
  });
});
