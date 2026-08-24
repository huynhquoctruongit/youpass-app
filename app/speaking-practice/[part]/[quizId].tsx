import { useLocalSearchParams } from "expo-router";
import { SpeakingPracticeScreen } from "@/components/speaking/speaking-practice-screen";
import type { SpeakingPart } from "@/services/api/speaking";

function toSpeakingPart(value: string): SpeakingPart {
  if (value === "2") return 2;
  if (value === "3") return 3;
  return 1;
}

export default function SpeakingPracticeRoute() {
  const raw = useLocalSearchParams<{
    part?: string;
    quizId?: string;
    title?: string;
    answerId?: string;
    answer_id?: string;
  }>();

  const part = toSpeakingPart(String(raw.part ?? "1"));
  const quizId = String(raw.quizId ?? "");
  const title = raw.title ? String(raw.title) : undefined;
  const answerIdRaw = raw.answerId ?? raw.answer_id;
  const answerId = answerIdRaw ? String(answerIdRaw) : undefined;

  return (
    <SpeakingPracticeScreen
      part={part}
      quizId={quizId}
      title={title}
      answerId={answerId}
    />
  );
}
