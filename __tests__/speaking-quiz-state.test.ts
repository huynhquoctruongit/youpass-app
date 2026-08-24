import {
  extractAnswerId,
  extractBand,
  getQuizState,
  summarizeTopicStates,
  type SpeakingQuiz,
} from "@/services/api/speaking";

const quiz = (overrides: Partial<SpeakingQuiz> = {}): SpeakingQuiz => ({
  id: "q1",
  title: "Sample question",
  ...overrides,
});

describe("extractAnswerId", () => {
  it("prefers answer_id, then latest_answer_id, then latest_answer extras", () => {
    expect(extractAnswerId(quiz({ answer_id: "A" }))).toBe("A");
    expect(extractAnswerId(quiz({ latest_answer_id: "B" }))).toBe("B");
    expect(
      extractAnswerId(quiz({ latest_answer: [{ extra: { answer_id: "C" } }] }))
    ).toBe("C");
    expect(extractAnswerId(quiz({ latest_answer: [{ id: "D" }] }))).toBe("D");
  });

  it("returns null when no answer id present", () => {
    expect(extractAnswerId(quiz())).toBeNull();
  });

  it("coerces numeric ids to string", () => {
    expect(extractAnswerId(quiz({ answer_id: 123 as unknown as string }))).toBe(
      "123"
    );
  });
});

describe("extractBand", () => {
  it("reads band from quiz.band_score", () => {
    expect(extractBand(quiz({ band_score: 6.5 }))).toBe(6.5);
  });

  it("reads band from latest_answer[0].band_score", () => {
    expect(extractBand(quiz({ latest_answer: [{ band_score: 7 }] }))).toBe(7);
  });

  it("ignores non-positive / invalid bands", () => {
    expect(extractBand(quiz({ band_score: 0 }))).toBeNull();
    expect(extractBand(quiz({ band_score: null }))).toBeNull();
    expect(extractBand(quiz())).toBeNull();
  });
});

describe("getQuizState — hybrid (web-compatible + upgradable)", () => {
  it("not_started when never submitted and no answer id", () => {
    expect(getQuizState(quiz()).status).toBe("not_started");
  });

  it("WEB fallback: is_submitted only => graded/done with band null", () => {
    const s = getQuizState(quiz({ is_submitted: true }));
    expect(s.status).toBe("graded");
    expect(s.band).toBeNull();
  });

  it("failed when marking_stage === FAILED", () => {
    const s = getQuizState(
      quiz({
        is_submitted: true,
        latest_answer: [{ marking_stage: "FAILED" }],
      })
    );
    expect(s.status).toBe("failed");
  });

  it("graded with band when band present", () => {
    const s = getQuizState(
      quiz({
        is_submitted: true,
        latest_answer: [{ band_score: 6.5, submission_type: "CHARGED" }],
      })
    );
    expect(s.status).toBe("graded");
    expect(s.band).toBe(6.5);
  });

  it("graded when status reviewed even without band", () => {
    const s = getQuizState(
      quiz({ is_submitted: true, latest_answer: [{ status: "reviewed" }] })
    );
    expect(s.status).toBe("graded");
  });

  it("free_saved when submission_type FREE and not graded", () => {
    const s = getQuizState(
      quiz({ is_submitted: true, latest_answer: [{ submission_type: "FREE" }] })
    );
    expect(s.status).toBe("free_saved");
    expect(s.band).toBeNull();
  });

  it("grading when CHARGED submitted but no band/marking yet", () => {
    const s = getQuizState(
      quiz({
        is_submitted: true,
        latest_answer: [{ submission_type: "CHARGED", id: "ans1" }],
      })
    );
    expect(s.status).toBe("grading");
    expect(s.answerId).toBe("ans1");
  });

  it("treats an answerId with no is_submitted as done (resumeable)", () => {
    const s = getQuizState(quiz({ answer_id: "X" }));
    expect(s.status).toBe("graded");
    expect(s.answerId).toBe("X");
  });

  // Regression: list API trả điểm trong latest_answer.extra + overall_status.
  describe("extra.overall_status (list API real shape)", () => {
    it("overall_status=2 => failed (không kẹt 'Đang chấm')", () => {
      const s = getQuizState(
        quiz({
          is_submitted: true,
          latest_answer: [
            {
              submission_type: "CHARGED",
              extra: {
                FC: 0,
                LR: 0,
                PR: 0,
                GRA: 0,
                overall: 0,
                overall_status: 2,
                answer_id: 14433,
              },
            },
          ],
        })
      );
      expect(s.status).toBe("failed");
      expect(s.answerId).toBe("14433");
    });

    it("overall_status=3 => graded với band từ extra.overall", () => {
      const s = getQuizState(
        quiz({
          is_submitted: true,
          latest_answer: [
            {
              submission_type: "CHARGED",
              extra: {
                FC: 7,
                LR: 6,
                PR: 7,
                GRA: 6,
                overall: 6.5,
                overall_status: 3,
                answer_id: 15018,
              },
            },
          ],
        })
      );
      expect(s.status).toBe("graded");
      expect(s.band).toBe(6.5);
      expect(s.answerId).toBe("15018");
    });

    it("overall_status=1 CHARGED => grading", () => {
      const s = getQuizState(
        quiz({
          is_submitted: true,
          latest_answer: [
            {
              submission_type: "CHARGED",
              extra: { overall_status: 1, answer_id: 999 },
            },
          ],
        })
      );
      expect(s.status).toBe("grading");
    });

    it("overall_status=1 FREE => free_saved", () => {
      const s = getQuizState(
        quiz({
          is_submitted: true,
          latest_answer: [
            {
              submission_type: "FREE",
              extra: { overall_status: 1, answer_id: 725 },
            },
          ],
        })
      );
      expect(s.status).toBe("free_saved");
    });
  });
});

describe("summarizeTopicStates", () => {
  it("counts done as any non not_started quiz (matches web is_submitted count)", () => {
    const quizzes: SpeakingQuiz[] = [
      quiz({ id: "1" }), // not_started
      quiz({ id: "2", is_submitted: true }), // graded (web done)
      quiz({ id: "3", is_submitted: true, latest_answer: [{ band_score: 8 }] }),
    ];
    const s = summarizeTopicStates(quizzes);
    expect(s.total).toBe(3);
    expect(s.done).toBe(2);
    expect(s.bestBand).toBe(8);
  });

  it("flags hasGrading but never hasFailed (listing hides errors)", () => {
    const quizzes: SpeakingQuiz[] = [
      quiz({
        id: "1",
        is_submitted: true,
        latest_answer: [{ submission_type: "CHARGED", id: "a" }],
      }),
      quiz({
        id: "2",
        is_submitted: true,
        latest_answer: [{ marking_stage: "FAILED" }],
      }),
    ];
    const s = summarizeTopicStates(quizzes);
    expect(s.hasGrading).toBe(true);
    expect(s.hasFailed).toBe(false);
  });

  it("failed quiz still counts as done (not shown as error)", () => {
    const quizzes: SpeakingQuiz[] = [
      quiz({ id: "1" }), // not_started
      quiz({
        id: "2",
        is_submitted: true,
        latest_answer: [
          { submission_type: "CHARGED", extra: { overall_status: 2 } },
        ],
      }),
    ];
    const s = summarizeTopicStates(quizzes);
    expect(s.done).toBe(1);
    expect(s.hasFailed).toBe(false);
  });

  it("empty topic => zero totals, null band", () => {
    const s = summarizeTopicStates([]);
    expect(s).toEqual({
      total: 0,
      done: 0,
      bestBand: null,
      hasGrading: false,
      hasFailed: false,
    });
  });

  it("picks the highest band across graded quizzes", () => {
    const quizzes: SpeakingQuiz[] = [
      quiz({ id: "1", is_submitted: true, latest_answer: [{ band_score: 5.5 }] }),
      quiz({ id: "2", is_submitted: true, latest_answer: [{ band_score: 7 }] }),
      quiz({ id: "3", is_submitted: true, latest_answer: [{ band_score: 6 }] }),
    ];
    expect(summarizeTopicStates(quizzes).bestBand).toBe(7);
  });
});
