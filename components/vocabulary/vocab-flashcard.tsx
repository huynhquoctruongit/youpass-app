import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type MyVocabWord } from "@/services/api/vocabulary";
import { HTMLText } from "./vocab-html-text";

const { width: SW, height: SH } = Dimensions.get("window");
const CARD_H = SH * 0.46;

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CFG = {
  0: { label: "Chưa thuộc", color: "#9CA3AF", bg: "#F3F4F6", border: "#D1D5DB", icon: "close-circle-outline" },
  1: { label: "Nhớ sơ",     color: "#F59E0B", bg: "#FFFBEB", border: "#F59E0B", icon: "time-outline" },
  2: { label: "Đã thuộc",   color: "#10B981", bg: "#ECFDF5", border: "#10B981", icon: "checkmark-circle-outline" },
} as const;

// ─── Weighted shuffle ────────────────────────────────────────────────────────
// Mirrors the web version: status-0 words appear first, status-2 last.

const WEIGHTS = [0.50, 0.35, 0.15];

function weightedShuffle(words: MyVocabWord[]): MyVocabWord[] {
  return [...words]
    .map((w) => ({
      w,
      key: Math.pow(Math.random(), 1 / (WEIGHTS[w.learning_status] ?? 0.15)),
    }))
    .sort((a, b) => b.key - a.key)
    .map(({ w }) => w);
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  words: MyVocabWord[];
  categoryName: string;
  mode: "learn" | "preview";
  onClose: () => void;
  onStatusChange: (id: string, status: 0 | 1 | 2) => void;
}

// ─── FlashcardScreen ─────────────────────────────────────────────────────────

export function FlashcardScreen({
  visible,
  words,
  categoryName,
  mode,
  onClose,
  onStatusChange,
}: Props) {
  const insets = useSafeAreaInsets();

  // ── Study queue ─────────────────────────────────────────────────────────────
  const [queue, setQueue]           = useState<MyVocabWord[]>([]);
  const [idx, setIdx]               = useState(0);
  const [isFlipped, setIsFlipped]   = useState(false);
  const [busy, setBusy]             = useState(false);
  const [done, setDone]             = useState(false);
  const [results, setResults]       = useState({ mastered: 0, partial: 0, notYet: 0 });

  // ── Reanimated ──────────────────────────────────────────────────────────────
  const flipVal   = useSharedValue(0); // 0 = front, 1 = back
  const slideX    = useSharedValue(0);
  const cardAlpha = useSharedValue(1);

  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: cardAlpha.value,
  }));

  // Front: rotates 0 → 180, visible when flip < 0.5
  const frontAnim = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipVal.value, [0, 1], [0, 180])}deg` },
    ],
    opacity: interpolate(flipVal.value, [0, 0.45, 0.5, 1], [1, 1, 0, 0]),
  }));

  // Back: rotates 180 → 360, visible when flip ≥ 0.5
  const backAnim = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipVal.value, [0, 1], [180, 360])}deg` },
    ],
    opacity: interpolate(flipVal.value, [0, 0.45, 0.5, 1], [0, 0, 1, 1]),
  }));

  // ── Initialise on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || words.length === 0) return;
    const initial = mode === "learn" ? weightedShuffle(words) : [...words];
    setQueue(initial);
    setIdx(0);
    setIsFlipped(false);
    setDone(false);
    setResults({ mastered: 0, partial: 0, notYet: 0 });
    flipVal.value   = 0;
    slideX.value    = 0;
    cardAlpha.value = 1;
  }, [visible, words, mode]);

  const word = queue[idx];

  // ── Card transition ─────────────────────────────────────────────────────────

  const applyNextCard = (nextIdx: number, isDone: boolean) => {
    // Called on JS thread from Reanimated callback
    setIdx(nextIdx);
    setIsFlipped(false);
    setBusy(false);
    if (isDone) setDone(true);
    requestAnimationFrame(() => {
      cardAlpha.value = withTiming(1, { duration: 200 });
      slideX.value    = withTiming(0, { duration: 240 });
    });
  };

  const goToCard = (nextIdx: number, dir: "left" | "right", isDone = false) => {
    if (busy) return;
    setBusy(true);
    const enterX = dir === "left" ? SW : -SW;

    cardAlpha.value = withTiming(0, { duration: 180 }, () => {
      flipVal.value = 0;
      slideX.value  = enterX;
      runOnJS(applyNextCard)(nextIdx, isDone);
    });
  };

  // ── Flip ────────────────────────────────────────────────────────────────────

  const handleFlip = () => {
    if (busy) return;
    const next = !isFlipped;
    flipVal.value = withTiming(next ? 1 : 0, { duration: 380 });
    setIsFlipped(next);
  };

  // ── Evaluate (learn mode) ───────────────────────────────────────────────────

  const handleEvaluate = (status: 0 | 1 | 2) => {
    if (busy || !word) return;

    onStatusChange(word.id, status);

    setResults((prev) => ({
      mastered: status === 2 ? prev.mastered + 1 : prev.mastered,
      partial:  status === 1 ? prev.partial  + 1 : prev.partial,
      notYet:   status === 0 ? prev.notYet   + 1 : prev.notYet,
    }));

    // Re-insert non-mastered words back into the queue
    const newQueue = [...queue];
    if (status !== 2) {
      const base   = status === 0 ? 6 : 4;
      const offset = base + Math.floor(Math.random() * 3);
      const at     = Math.min(idx + 1 + offset, newQueue.length);
      newQueue.splice(at, 0, { ...word, learning_status: status });
    }

    const nextIdx = idx + 1;
    const isDone  = nextIdx >= newQueue.length;
    setQueue(newQueue);
    goToCard(nextIdx, "left", isDone);
  };

  // ── Prev / Next (preview mode) ──────────────────────────────────────────────

  const handlePrev = () => { if (idx > 0) goToCard(idx - 1, "right"); };
  const handleNext = () => { if (idx < queue.length - 1) goToCard(idx + 1, "left"); };

  // ── Progress ────────────────────────────────────────────────────────────────

  const progressPct = queue.length > 0 ? (idx / queue.length) * 100 : 0;
  const cardLabel   = `${Math.min(idx + 1, queue.length)} / ${queue.length}`;

  // ── Empty words guard ───────────────────────────────────────────────────────

  if (!visible) return null;
  if (words.length === 0) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="book-outline" size={48} color="#E5E7EB" />
          <Text style={{ fontSize: 15, color: "#9CA3AF", marginTop: 16 }}>Không có từ vựng nào</Text>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 20, backgroundColor: "#F97316", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}>

        {/* ── Header ── */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: "#fff",
          borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={{ marginRight: 12 }}>
            <View style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: "#F3F4F6",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="arrow-back" size={18} color="#374151" />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
              {mode === "learn" ? "Học Flashcard" : "Xem trước"}
            </Text>
            <Text style={{ fontSize: 11, color: "#9CA3AF" }} numberOfLines={1}>{categoryName}</Text>
          </View>

          {!done && (
            <View style={{
              backgroundColor: "#FFF7ED", borderRadius: 10,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#F97316" }}>{cardLabel}</Text>
            </View>
          )}
        </View>

        {/* ── Progress bar ── */}
        {!done && (
          <View style={{ height: 3, backgroundColor: "#F3F4F6" }}>
            <View style={{ width: `${progressPct}%`, height: 3, backgroundColor: "#F97316" }} />
          </View>
        )}

        {/* ────────────────────────────────────────────────────────────────────
            Done / Result screen
        ──────────────────────────────────────────────────────────────────── */}
        {done ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
            {/* Trophy icon */}
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: "#ECFDF5",
              alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <Ionicons name="trophy" size={40} color="#10B981" />
            </View>

            <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 6 }}>
              Hoàn thành! 🎉
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 32, lineHeight: 20 }}>
              Bạn đã ôn xong {words.length} từ trong sổ "{categoryName}"
            </Text>

            {/* Result stats */}
            <View style={{ flexDirection: "row", gap: 10, width: "100%", marginBottom: 36 }}>
              {([
                { label: "Đã thuộc",   value: results.mastered, color: "#10B981", bg: "#ECFDF5", icon: "checkmark-circle" as const },
                { label: "Nhớ sơ",     value: results.partial,  color: "#F59E0B", bg: "#FFFBEB", icon: "time"            as const },
                { label: "Chưa thuộc", value: results.notYet,   color: "#9CA3AF", bg: "#F9FAFB", icon: "ellipse-outline" as const },
              ] as const).map((item) => (
                <View key={item.label} style={{
                  flex: 1, backgroundColor: item.bg, borderRadius: 16,
                  padding: 14, alignItems: "center", gap: 4,
                }}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                  <Text style={{ fontSize: 22, fontWeight: "800", color: item.color }}>{item.value}</Text>
                  <Text style={{ fontSize: 10, color: item.color, textAlign: "center" }}>{item.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={{ width: "100%" }}>
              <View style={{
                backgroundColor: "#F97316", borderRadius: 14,
                paddingVertical: 15, alignItems: "center",
              }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Hoàn thành & Thoát</Text>
              </View>
            </TouchableOpacity>
          </View>

        ) : (
        /* ────────────────────────────────────────────────────────────────────
            Flashcard player
        ──────────────────────────────────────────────────────────────────── */
          <View style={{ flex: 1, paddingBottom: insets.bottom + 8 }}>

            {/* Card wrapper — centres the card and absorbs the slide animation */}
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>

              {/* Mode hint */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 14 }}>
                <Ionicons
                  name={mode === "learn" ? "school-outline" : "eye-outline"}
                  size={13} color="#C4C4C4"
                />
                <Text style={{ fontSize: 12, color: "#C4C4C4" }}>
                  {mode === "learn" ? "Nhấn thẻ để lật" : "Lướt qua tất cả từ"}
                </Text>
              </View>

              {/* ── The card ── */}
              <Reanimated.View style={[containerAnim, { width: "100%", height: CARD_H }]}>

                {/* ── Front face ── */}
                <Reanimated.View style={[frontAnim, {
                  position: "absolute", width: "100%", height: "100%",
                  backgroundColor: "#fff",
                  borderRadius: 22, borderWidth: 1, borderColor: "#E5E7EB",
                }]}>
                  <TouchableOpacity
                    onPress={handleFlip}
                    activeOpacity={0.95}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}
                  >
                    {word && (
                      <>
                        {/* Status badge */}
                        {word.learning_status !== undefined && (
                          <View style={{
                            position: "absolute", top: 16, right: 16,
                            backgroundColor: STATUS_CFG[word.learning_status].bg,
                            borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: STATUS_CFG[word.learning_status].color }}>
                              {STATUS_CFG[word.learning_status].label}
                            </Text>
                          </View>
                        )}

                        {/* Word class */}
                        {!!word.word_class && (
                          <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 6 }}>
                            ({word.word_class})
                          </Text>
                        )}

                        {/* Main word */}
                        <Text style={{
                          fontSize: 36, fontWeight: "800", color: "#111827",
                          textAlign: "center", lineHeight: 44,
                        }}>
                          {word.value}
                        </Text>

                        {/* IPA */}
                        {!!word.ipa && (
                          <Text style={{ fontSize: 15, color: "#9CA3AF", marginTop: 8 }}>
                            {word.ipa}
                          </Text>
                        )}

                        {/* Flip hint */}
                        <View style={{
                          position: "absolute", bottom: 16,
                          flexDirection: "row", alignItems: "center", gap: 4,
                        }}>
                          <Ionicons name="sync-outline" size={12} color="#D1D5DB" />
                          <Text style={{ fontSize: 11, color: "#D1D5DB" }}>Nhấn để lật</Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </Reanimated.View>

                {/* ── Back face ── */}
                <Reanimated.View style={[backAnim, {
                  position: "absolute", width: "100%", height: "100%",
                  backgroundColor: "#FFF7ED",
                  borderRadius: 22, borderWidth: 1.5, borderColor: "#FDBA74",
                }]}>
                  <TouchableOpacity
                    onPress={handleFlip}
                    activeOpacity={0.95}
                    style={{ flex: 1, padding: 24, justifyContent: "center" }}
                  >
                    {word && (
                      <>
                        {/* "Back" label */}
                        <View style={{
                          position: "absolute", top: 16, left: 16,
                          backgroundColor: "rgba(249,115,22,0.12)", borderRadius: 6,
                          paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#F97316" }}>Nghĩa</Text>
                        </View>

                        {/* Meaning */}
                        <HTMLText
                          html={word.meaning}
                          style={{
                            fontSize: 28, fontWeight: "800", color: "#111827",
                            textAlign: "center", lineHeight: 36,
                            marginBottom: word.example ? 16 : 0,
                          }}
                        />

                        {/* Divider */}
                        {!!word.example && (
                          <View style={{ height: 1, backgroundColor: "#FDBA74", opacity: 0.4, marginBottom: 14 }} />
                        )}

                        {/* Example */}
                        {!!word.example && (
                          <View>
                            <Text style={{
                              fontSize: 10, fontWeight: "700", color: "#F97316",
                              letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6,
                            }}>
                              Ví dụ
                            </Text>
                            <HTMLText
                              html={word.example}
                              style={{ fontSize: 13, color: "#6B7280", lineHeight: 20, fontStyle: "italic" }}
                              numberOfLines={4}
                            />
                          </View>
                        )}

                        {/* Flip back hint */}
                        <View style={{
                          position: "absolute", bottom: 16, right: 16,
                          flexDirection: "row", alignItems: "center", gap: 4,
                        }}>
                          <Ionicons name="sync-outline" size={12} color="#FDBA74" />
                          <Text style={{ fontSize: 11, color: "#FDBA74" }}>Lật lại</Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </Reanimated.View>

              </Reanimated.View>
            </View>

            {/* ── Bottom controls ── */}
            <View style={{ paddingHorizontal: 20 }}>
              {mode === "learn" ? (
                /* ── Evaluation buttons ── */
                <>
                  <Text style={{
                    fontSize: 12, color: isFlipped ? "#9CA3AF" : "#D1D5DB",
                    textAlign: "center", marginBottom: 12,
                  }}>
                    {isFlipped ? "Bạn nhớ từ này không?" : "Lật thẻ trước khi đánh giá"}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {([0, 1, 2] as const).map((status) => {
                      const cfg     = STATUS_CFG[status];
                      const enabled = isFlipped && !busy;
                      return (
                        <TouchableOpacity
                          key={status}
                          onPress={() => handleEvaluate(status)}
                          disabled={!enabled}
                          activeOpacity={0.75}
                          style={{ flex: 1 }}
                        >
                          <View style={{
                            backgroundColor: enabled ? cfg.bg : "#F9FAFB",
                            borderRadius: 14, paddingVertical: 13,
                            alignItems: "center", gap: 4,
                            borderWidth: 1.5,
                            borderColor: enabled ? cfg.border : "#E5E7EB",
                            opacity: enabled ? 1 : 0.45,
                          }}>
                            <Ionicons
                              name={cfg.icon as any}
                              size={20}
                              color={enabled ? cfg.color : "#D1D5DB"}
                            />
                            <Text style={{ fontSize: 11, fontWeight: "600", color: enabled ? cfg.color : "#D1D5DB" }}>
                              {cfg.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                /* ── Preview navigation ── */
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 }}>
                  <TouchableOpacity onPress={handlePrev} disabled={idx === 0 || busy} activeOpacity={0.75}>
                    <View style={{
                      width: 52, height: 52, borderRadius: 26,
                      backgroundColor: idx === 0 ? "#F3F4F6" : "#fff",
                      alignItems: "center", justifyContent: "center",
                      borderWidth: 1, borderColor: "#E5E7EB",
                    }}>
                      <Ionicons name="chevron-back" size={24} color={idx === 0 ? "#D1D5DB" : "#374151"} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleFlip} activeOpacity={0.8}>
                    <View style={{
                      width: 52, height: 52, borderRadius: 26,
                      backgroundColor: "#F97316",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons name="sync-outline" size={22} color="#fff" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleNext} disabled={idx >= queue.length - 1 || busy} activeOpacity={0.75}>
                    <View style={{
                      width: 52, height: 52, borderRadius: 26,
                      backgroundColor: idx >= queue.length - 1 ? "#F3F4F6" : "#fff",
                      alignItems: "center", justifyContent: "center",
                      borderWidth: 1, borderColor: "#E5E7EB",
                    }}>
                      <Ionicons name="chevron-forward" size={24} color={idx >= queue.length - 1 ? "#D1D5DB" : "#374151"} />
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
        )}
      </View>
    </Modal>
  );
}
