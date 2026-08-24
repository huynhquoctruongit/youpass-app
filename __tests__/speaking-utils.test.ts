import {
  buildSpeakingPracticeUrl,
  countWords,
  flattenQuizzesFromTags,
  flattenQuizzesFromTopics,
  formatSeconds,
  getNextQuiz,
  SHORT_ANSWER_MIN_WORDS,
  type SpeakingQuiz,
  type SpeakingTagGroup,
  type SpeakingTopic,
} from "@/services/api/speaking";

describe("countWords", () => {
  it("counts words, collapsing whitespace", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  hello   world  ")).toBe(2);
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("one")).toBe(1);
  });
});

describe("formatSeconds", () => {
  it("formats mm:ss with zero padding", () => {
    expect(formatSeconds(0)).toBe("0:00");
    expect(formatSeconds(5)).toBe("0:05");
    expect(formatSeconds(65)).toBe("1:05");
    expect(formatSeconds(600)).toBe("10:00");
  });
  it("clamps negatives to 0", () => {
    expect(formatSeconds(-10)).toBe("0:00");
  });
});

describe("SHORT_ANSWER_MIN_WORDS", () => {
  it("matches web constants", () => {
    expect(SHORT_ANSWER_MIN_WORDS).toEqual({ 1: 40, 2: 160, 3: 60 });
  });
});

describe("flatten helpers", () => {
  const quizzes: SpeakingQuiz[] = [
    { id: 1 as unknown as string, title: "q1" },
    { id: 2 as unknown as string, title: "q2" },
  ];
  const topics: SpeakingTopic[] = [
    { id: "t1", title: "topic1", quizzes },
    { id: "t2", title: "topic2", quizzes: [{ id: "3", title: "q3" }] },
  ];
  const tags: SpeakingTagGroup[] = [{ id: "s1", title: "src", topics }];

  it("flattenQuizzesFromTopics flattens and stringifies ids", () => {
    const out = flattenQuizzesFromTopics(topics);
    expect(out.map((q) => q.id)).toEqual(["1", "2", "3"]);
  });

  it("flattenQuizzesFromTags flattens nested tags/topics/quizzes", () => {
    const out = flattenQuizzesFromTags(tags);
    expect(out.map((q) => q.id)).toEqual(["1", "2", "3"]);
  });

  it("handles empty structures gracefully", () => {
    expect(flattenQuizzesFromTopics([])).toEqual([]);
    expect(flattenQuizzesFromTags([])).toEqual([]);
  });
});

describe("getNextQuiz", () => {
  const quizzes: SpeakingQuiz[] = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
    { id: "c", title: "C" },
  ];

  it("returns the next quiz in the flattened list", () => {
    expect(getNextQuiz(quizzes, "a")?.id).toBe("b");
    expect(getNextQuiz(quizzes, "b")?.id).toBe("c");
  });

  it("returns null at the end or when not found", () => {
    expect(getNextQuiz(quizzes, "c")).toBeNull();
    expect(getNextQuiz(quizzes, "zzz")).toBeNull();
  });

  it("matches by string-coerced id", () => {
    expect(getNextQuiz(quizzes, "a" as unknown as string)?.id).toBe("b");
  });
});

describe("buildSpeakingPracticeUrl", () => {
  it("builds base url per part/quiz", () => {
    const url = buildSpeakingPracticeUrl(1, "quiz123");
    expect(url).toContain("/practice/speaking-part-1/quiz123");
  });
  it("appends answer_id when provided", () => {
    const url = buildSpeakingPracticeUrl(2, "quizXYZ", "ans9");
    expect(url).toContain("/practice/speaking-part-2/quizXYZ?answer_id=ans9");
  });
});
