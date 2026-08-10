import Ionicons from "@expo/vector-icons/Ionicons";
import { ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  type MyVocabWord,
  type VocabCategory,
  type VocabOverview,
  vocabularyApi,
} from "@/services/api/vocabulary";
import { FlashcardScreen } from "./vocab-flashcard";
import { HTMLText } from "./vocab-html-text";

// ─── Constants ───────────────────────────────────────────────────────────────

// Background colour used for the edge-fade simulation (must match root bg)
const TAB_BG = "#F9FAFB";
// Opacity steps for the simulated gradient (outer → inner)
const FADE_STEPS = [1, 0.82, 0.62, 0.42, 0.22, 0.08];
const STEP_W = 7; // px per step → total fade width = 42px

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  2: { label: "Đã thuộc", color: "#10B981", bg: "#ECFDF5", icon: "checkmark-circle" },
  1: { label: "Nhớ sơ",   color: "#F59E0B", bg: "#FFFBEB", icon: "time-outline" },
  0: { label: "Chưa thuộc", color: "#9CA3AF", bg: "#F9FAFB", icon: "ellipse-outline" },
};

// ─── Overview Card ──────────────────────────────────────────────────────────

function OverviewCard({ overview }: { overview: VocabOverview }) {
  const total    = overview.total_words ?? 0;
  const mastered = overview.mastered ?? 0;
  const partial  = overview.partially_remembered ?? 0;
  const notYet   = overview.not_mastered ?? 0;
  const masteredPct = total > 0 ? (mastered / total) * 100 : 0;
  const partialPct  = total > 0 ? ((mastered + partial) / total) * 100 : 0;

  return (
    <View style={{
      backgroundColor: "#fff",
      marginHorizontal: 16, marginTop: 12, marginBottom: 4,
      borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: "#F3F4F6",
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Tổng quan</Text>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#F97316" }}>{total} từ</Text>
      </View>

      {/* Progress bar */}
      <View style={{ height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${partialPct}%`, backgroundColor: "#FCD34D", borderRadius: 4 }} />
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${masteredPct}%`, backgroundColor: "#10B981", borderRadius: 4 }} />
      </View>

      <View style={{ flexDirection: "row" }}>
        {[
          { label: "Đã thuộc",   value: mastered, color: "#10B981" },
          { label: "Nhớ sơ",     value: partial,  color: "#F59E0B" },
          { label: "Chưa thuộc", value: notYet,   color: "#9CA3AF" },
        ].map((item, i) => (
          <View key={item.label} style={{ flex: 1, alignItems: "center" }}>
            {i > 0 && (
              <View style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 1, backgroundColor: "#F3F4F6" }} />
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
              <Text style={{ fontSize: 11, color: "#6B7280" }}>{item.label}</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Word Item ──────────────────────────────────────────────────────────────

function WordItem({
  word,
  onStatusChange,
  onDelete,
}: {
  word: MyVocabWord;
  onStatusChange: (s: 0 | 1 | 2) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[word.learning_status] ?? STATUS_CONFIG[0];
  const nextStatus: 0 | 1 | 2 = word.learning_status === 2 ? 0 : word.learning_status === 1 ? 2 : 1;

  return (
    <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
      <View style={{
        backgroundColor: "#fff",
        borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
        paddingHorizontal: 16, paddingVertical: 13,
        flexDirection: "row", alignItems: "flex-start", gap: 12,
      }}>

        {/* Status icon — tap to cycle */}
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onStatusChange(nextStatus); }}
          hitSlop={10}
          style={{ paddingTop: 1 }}
        >
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </TouchableOpacity>

        {/* Word info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              {word.value}
            </Text>
            {!!word.word_class && (
              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>({word.word_class})</Text>
            )}
            {!!word.ipa && (
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{word.ipa}</Text>
            )}
          </View>
          <HTMLText
            html={word.meaning}
            style={{ fontSize: 13, color: "#6B7280", marginTop: 3, lineHeight: 18 }}
            numberOfLines={expanded ? undefined : 1}
          />
          {expanded && !!word.example && (
            <View style={{ marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#F3F4F6" }}>
              <HTMLText
                html={word.example}
                style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic", lineHeight: 18 }}
              />
            </View>
          )}
        </View>

        {/* Status chip + delete */}
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", color: cfg.color }}>{cfg.label}</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onDelete(); }}
            hitSlop={10}
          >
            <Ionicons name="trash-outline" size={15} color="#D1D5DB" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Status Filter ─────────────────────────────────────────────────────────

function StatusFilter({
  selected,
  onChange,
  counts,
}: {
  selected: number[];
  onChange: (s: number[]) => void;
  counts: Record<number, number>;
}) {
  const toggle = (s: number) =>
    onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);

  return (
    <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4 }}>
      {[2, 1, 0].map((s) => {
        const cfg    = STATUS_CONFIG[s];
        const active = selected.includes(s);
        const count  = counts[s] ?? 0;
        return (
          <TouchableOpacity key={s} onPress={() => toggle(s)} activeOpacity={0.7}>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: active ? cfg.bg : "#F9FAFB",
              borderWidth: 1,
              borderColor: active ? cfg.color : "#E5E7EB",
              flexDirection: "row", alignItems: "center", gap: 5,
            }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: active ? cfg.color : "#D1D5DB" }} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: active ? cfg.color : "#9CA3AF" }}>
                {cfg.label}
              </Text>
              {count > 0 && (
                <View style={{ backgroundColor: active ? cfg.color : "#E5E7EB", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: active ? "#fff" : "#9CA3AF" }}>{count}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────

export function MyVocabScreen() {
  const [categories, setCategories]         = useState<VocabCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<VocabCategory | null>(null);
  const [words, setWords]                   = useState<MyVocabWord[]>([]);
  const [overview, setOverview]             = useState<VocabOverview | null>(null);
  const [loading, setLoading]               = useState(true);
  const [wordsLoading, setWordsLoading]     = useState(false);
  const [statusFilter, setStatusFilter]     = useState<number[]>([0, 1, 2]);

  // ── Flashcard state ──────────────────────────────────────────────────────
  const [flashcardMode, setFlashcardMode]   = useState<"learn" | "preview" | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────

  const fetchBase = useCallback(async () => {
    try {
      const [cats, ov] = await Promise.all([
        vocabularyApi.getCategories(),
        vocabularyApi.getOverview(),
      ]);
      setCategories(cats);
      setOverview(ov);
      // Functional updater avoids stale-closure: only set if not already chosen
      if (cats.length > 0) setActiveCategory((prev) => prev ?? cats[0]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWords = useCallback(async (cat: VocabCategory) => {
    setWordsLoading(true);
    try {
      const data = await vocabularyApi.getMyVocabs(cat.code);
      setWords(data.items || []);
    } catch {
      setWords([]);
    } finally {
      setWordsLoading(false);
    }
  }, []);

  useEffect(() => { fetchBase(); }, []);

  useEffect(() => {
    if (activeCategory) fetchWords(activeCategory);
  }, [activeCategory?.code]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleStatusChange = async (word: MyVocabWord, status: 0 | 1 | 2) => {
    // Optimistic update
    setWords((prev) => prev.map((w) => w.id === word.id ? { ...w, learning_status: status } : w));
    try {
      await vocabularyApi.updateStatus([word.id], status);
      const ov = await vocabularyApi.getOverview();
      setOverview(ov);
    } catch {
      // Rollback
      setWords((prev) => prev.map((w) => w.id === word.id ? { ...w, learning_status: word.learning_status } : w));
    }
  };

  const handleDelete = (word: MyVocabWord) => {
    Alert.alert("Xoá từ vựng", `Bỏ "${word.value}" khỏi sổ?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá", style: "destructive",
        onPress: async () => {
          setWords((prev) => prev.filter((w) => w.id !== word.id));
          try {
            await vocabularyApi.deleteVocabs([word.id]);
            const ov = await vocabularyApi.getOverview();
            setOverview(ov);
          } catch {
            if (activeCategory) fetchWords(activeCategory);
          }
        },
      },
    ]);
  };

  // ── Derived state ────────────────────────────────────────────────────────

  const filteredWords = words.filter((w) => statusFilter.includes(w.learning_status));

  // Word counts per status (for filter badge)
  const statusCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  for (const w of words) statusCounts[w.learning_status] = (statusCounts[w.learning_status] ?? 0) + 1;

  // Per-category stats for the active category
  const catStats = overview?.categories?.find((c) => c.code === activeCategory?.code);

  // ── Category-tab scroll state ────────────────────────────────────────────

  const tabScrollRef   = useRef<ScrollView>(null);
  const [tabScrollX,   setTabScrollX]   = useState(0);
  const [tabContentW,  setTabContentW]  = useState(0);
  const [tabContainerW, setTabContainerW] = useState(0);

  const canScrollLeft  = tabScrollX > 10;
  const canScrollRight = tabContentW - tabScrollX - tabContainerW > 10;

  const SCROLL_STEP = 160;
  const scrollTabLeft  = () => tabScrollRef.current?.scrollTo({ x: Math.max(0, tabScrollX - SCROLL_STEP), animated: true });
  const scrollTabRight = () => tabScrollRef.current?.scrollTo({ x: tabScrollX + SCROLL_STEP, animated: true });

  // ── Loading / empty states ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#F97316" size="large" />
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="book-outline" size={32} color="#F97316" />
        </View>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#374151", textAlign: "center" }}>
          Sổ từ vựng trống
        </Text>
        <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
          Vào Kho từ vựng để thêm từ vào sổ của bạn
        </Text>
      </View>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>

      {/* ── Overview card ── */}
      {overview && <OverviewCard overview={overview} />}

      {/* ── Category tabs with fade edges + prev/next arrows ── */}
      <View style={{ position: "relative" }}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 48, paddingVertical: 10, gap: 8, alignItems: "center" }}
          onScroll={(e) => setTabScrollX(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          onContentSizeChange={(w) => setTabContentW(w)}
          onLayout={(e) => setTabContainerW(e.nativeEvent.layout.width)}
        >
          {categories.map((cat) => {
            const isActive = activeCategory?.code === cat.code;
            const catData  = overview?.categories?.find((c) => c.code === cat.code);
            const total    = catData?.total_words ?? 0;
            return (
              <TouchableOpacity key={cat.code} onPress={() => setActiveCategory(cat)} activeOpacity={0.7}>
                <View style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? "#F97316" : "#fff",
                  borderWidth: 1,
                  borderColor: isActive ? "#F97316" : "#E5E7EB",
                  flexDirection: "row", alignItems: "center", gap: 6,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? "#fff" : "#6B7280" }}>
                    {cat.name}
                  </Text>
                  {total > 0 && (
                    <View style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#F3F4F6",
                      borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: isActive ? "#fff" : "#9CA3AF" }}>
                        {total}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Left fade + prev button ── */}
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 48, justifyContent: "center" }}
        >
          {/* Gradient simulation: opaque on left edge → transparent towards centre */}
          <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: FADE_STEPS.length * STEP_W }}>
            {FADE_STEPS.map((opacity, i) => (
              <View
                key={i}
                style={{ position: "absolute", left: i * STEP_W, top: 0, bottom: 0, width: STEP_W, backgroundColor: TAB_BG, opacity }}
              />
            ))}
          </View>
          {/* Prev button */}
          {canScrollLeft && (
            <TouchableOpacity onPress={scrollTabLeft} activeOpacity={0.8} style={{ zIndex: 2, paddingLeft: 8 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: "#fff",
                alignItems: "center", justifyContent: "center",
                borderWidth: 1, borderColor: "#E5E7EB",
                shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              }}>
                <Ionicons name="chevron-back" size={14} color="#374151" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Right fade + next button ── */}
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 48, justifyContent: "center", alignItems: "flex-end" }}
        >
          {/* Gradient simulation: transparent on left → opaque on right edge */}
          <View pointerEvents="none" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: FADE_STEPS.length * STEP_W }}>
            {[...FADE_STEPS].reverse().map((opacity, i) => (
              <View
                key={i}
                style={{ position: "absolute", left: i * STEP_W, top: 0, bottom: 0, width: STEP_W, backgroundColor: TAB_BG, opacity }}
              />
            ))}
          </View>
          {/* Next button */}
          {canScrollRight && (
            <TouchableOpacity onPress={scrollTabRight} activeOpacity={0.8} style={{ zIndex: 2, paddingRight: 8 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: "#fff",
                alignItems: "center", justifyContent: "center",
                borderWidth: 1, borderColor: "#E5E7EB",
                shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              }}>
                <Ionicons name="chevron-forward" size={14} color="#374151" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Status filter ── */}
      <StatusFilter selected={statusFilter} onChange={setStatusFilter} counts={statusCounts} />

      {/* ── Flashcard entry buttons ── */}
      {words.length > 0 && (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 12 }}>
          {/* Learn mode — uses only non-mastered + partial words by default */}
          <TouchableOpacity
            onPress={() => setFlashcardMode("learn")}
            activeOpacity={0.8}
            style={{ flex: 1 }}
          >
            <View style={{
              backgroundColor: "#F97316", borderRadius: 12,
              paddingVertical: 10,
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
            }}>
              <Ionicons name="school-outline" size={16} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Học Flashcard</Text>
            </View>
          </TouchableOpacity>

          {/* Preview mode — browse all words */}
          <TouchableOpacity
            onPress={() => setFlashcardMode("preview")}
            activeOpacity={0.8}
            style={{ flex: 1 }}
          >
            <View style={{
              backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB",
              paddingVertical: 10,
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
            }}>
              <Ionicons name="eye-outline" size={16} color="#6B7280" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280" }}>Xem trước</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Word list ── */}
      {wordsLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#F97316" />
        </View>
      ) : filteredWords.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 }}>
          <Ionicons name="search-outline" size={36} color="#E5E7EB" />
          <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 12 }}>
            {words.length === 0 ? "Sổ này chưa có từ nào" : "Không có từ nào phù hợp"}
          </Text>
        </View>
      ) : (
        <>
          {/* Word count header */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
              {filteredWords.length} / {words.length} từ
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100, backgroundColor: "#fff" }}
            showsVerticalScrollIndicator={false}
          >
            {filteredWords.map((word) => (
              <WordItem
                key={word.id}
                word={word}
                onStatusChange={(s) => handleStatusChange(word, s)}
                onDelete={() => handleDelete(word)}
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* ── Flashcard modal ── */}
      {flashcardMode !== null && (
        <FlashcardScreen
          visible
          words={flashcardMode === "learn" ? words.filter((w) => w.learning_status !== 2) : words}
          categoryName={activeCategory?.name ?? ""}
          mode={flashcardMode}
          onClose={() => setFlashcardMode(null)}
          onStatusChange={(id, status) => handleStatusChange(
            words.find((w) => w.id === id)!,
            status,
          )}
        />
      )}
    </View>
  );
}
