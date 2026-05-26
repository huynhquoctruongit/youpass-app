import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type VocabSet, type VocabSetStat, type VocabWord, vocabularyApi } from "@/services/api/vocabulary";
import { SaveToVocabModal } from "./vocab-save-modal";

const CMS_URL = process.env.EXPO_PUBLIC_CMS || "";
const { width: SW, height: SH } = Dimensions.get("window");

// ─── Bank Word Item ─────────────────────────────────────────────────────────

export function BankWordItem({
  word,
  selected,
  index,
  onToggle,
}: {
  word: VocabWord;
  selected: boolean;
  index: number;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.65}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        backgroundColor: selected ? "#FFF7ED" : "#fff",
        gap: 12,
      }}>
        {/* Text content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 5 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              {word.value}
            </Text>
            {!!word.ipa && (
              <Text style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
                {word.ipa}
              </Text>
            )}
            {!!word.is_saved && (
              <Ionicons name="bookmark" size={12} color="#10B981" />
            )}
          </View>
          <Text
            style={{ fontSize: 13, color: "#6B7280", marginTop: 2, lineHeight: 18 }}
            numberOfLines={2}
          >
            {word.meaning}
          </Text>
        </View>

        {/* Radio circle */}
        <View style={{
          width: 22, height: 22, borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? "#F97316" : "#D1D5DB",
          backgroundColor: selected ? "#F97316" : "#fff",
          alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Set Detail Bottom Sheet ────────────────────────────────────────────────

export function SetDetailSheet({
  set,
  stat,
  onClose,
  onSaved,
}: {
  set: VocabSet | null;
  stat?: VocabSetStat;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveType, setSaveType] = useState<"ALL" | "SELECTED">("ALL");
  const insets = useSafeAreaInsets();
  const SHEET_H = SH * 0.88;

  // Button animation: full-width ↔ split-half when selection changes
  const BTN_ROW_W = SW - 32; // 16px padding each side
  const BTN_GAP = 10;
  const BTN_HALF = (BTN_ROW_W - BTN_GAP) / 2;

  const btn1W = useSharedValue(BTN_ROW_W);
  const btn2W = useSharedValue(0);
  const btn2Opacity = useSharedValue(0);

  const btn1Style = useAnimatedStyle(() => ({ width: btn1W.value }));
  const btn2Style = useAnimatedStyle(() => ({
    width: btn2W.value,
    opacity: btn2Opacity.value,
    overflow: "hidden",
  }));

  useEffect(() => {
    if (!set) return;
    setLoading(true);
    setSelected([]);
    vocabularyApi
      .getSetDetail(set.id)
      .then((d) => setWords(d.words ?? []))
      .catch(() => setWords([]))
      .finally(() => setLoading(false));
  }, [set?.id]);

  const toggleWord = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelected((prev) =>
      prev.length === words.length ? [] : words.map((w) => w.id)
    );

  const handleSave = async (categoryCode: string) => {
    if (!set) return;
    await vocabularyApi.saveVocabs({
      set_id: set.id,
      category_code: categoryCode,
      add_type: saveType,
      vocab_ids: saveType === "SELECTED" ? selected : undefined,
    });
    onSaved();
  };

  // Animate buttons when selection state changes
  useEffect(() => {
    if (selected.length > 0) {
      btn1W.value = withTiming(BTN_HALF, { duration: 220 });
      btn2W.value = withTiming(BTN_HALF, { duration: 220 });
      btn2Opacity.value = withTiming(1, { duration: 200 });
    } else {
      btn1W.value = withTiming(BTN_ROW_W, { duration: 200 });
      btn2W.value = withTiming(0, { duration: 200 });
      btn2Opacity.value = withTiming(0, { duration: 150 });
    }
  }, [selected.length > 0]);

  if (!set) return null;

  const saved = stat?.saved_words ?? 0;
  const total = stat?.total_words ?? set.total_words ?? 0;
  const pct = total > 0 ? Math.round((saved / total) * 100) : 0;
  const imageUrl = set.thumbnail ? `${CMS_URL}/assets/${set.thumbnail}` : null;
  const allSelected = words.length > 0 && selected.length === words.length;

  return (
    <Modal visible={!!set} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
        {/* Backdrop tap */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        {/* Sheet — fixed height so ScrollView can fill remaining space */}
        <View style={{
          height: SHEET_H,
          backgroundColor: "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}>

          {/* ── Header ── */}
          <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" }} />
            </View>

            {/* Title row */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingBottom: 14 }}>
              {/* Thumbnail */}
              <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", backgroundColor: "#FFF0E5", flexShrink: 0 }}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ width: 56, height: 56 }} contentFit="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="book" size={24} color="#F97316" />
                  </View>
                )}
              </View>

              {/* Name + stats */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: "#111827" }} numberOfLines={2}>
                    {set.name}
                  </Text>
                  <Pressable
                    onPress={onClose}
                    hitSlop={12}
                    style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginLeft: 8 }}
                  >
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Ionicons name="layers-outline" size={11} color="#6B7280" />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151" }}>{total} từ</Text>
                  </View>
                  {pct > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ECFDF5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Ionicons name="bookmark" size={11} color="#10B981" />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#10B981" }}>{pct}% đã lưu</Text>
                    </View>
                  )}
                </View>

                {pct > 0 && (
                  <View style={{ marginTop: 8, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
                    <View style={{ width: `${pct}%`, height: 4, backgroundColor: "#10B981", borderRadius: 2 }} />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── Select-all bar ── */}
          {!loading && words.length > 0 && (
            <TouchableOpacity onPress={toggleAll} activeOpacity={0.7}>
              <View style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                paddingHorizontal: 16, paddingVertical: 12,
                backgroundColor: "#fff",
                borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: allSelected ? "#F97316" : "#fff",
                    borderWidth: 2, borderColor: allSelected ? "#F97316" : "#D1D5DB",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {allSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: allSelected ? "#F97316" : "#111827" }}>
                    {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: selected.length > 0 ? "#FFF7ED" : "#F3F4F6",
                  borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: selected.length > 0 ? "#F97316" : "#9CA3AF" }}>
                    {selected.length}/{words.length}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Word list (scrollable) ── */}
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#F97316" size="large" />
              <Text style={{ marginTop: 12, fontSize: 13, color: "#9CA3AF" }}>Đang tải từ vựng...</Text>
            </View>
          ) : words.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="document-outline" size={40} color="#E5E7EB" />
              <Text style={{ marginTop: 12, fontSize: 14, color: "#9CA3AF" }}>Không có từ vựng</Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {words.map((w, i) => (
                <BankWordItem
                  key={w.id}
                  word={w}
                  index={i}
                  selected={selected.includes(w.id)}
                  onToggle={() => toggleWord(w.id)}
                />
              ))}
            </ScrollView>
          )}

          {/* ── Sticky bottom buttons ── */}
          <View style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            backgroundColor: "#fff",
            flexDirection: "row",
            gap: BTN_GAP,
          }}>
            {/* Button 1 – Lưu tất cả (animates to half-width when words are selected) */}
            <Reanimated.View style={btn1Style}>
              <TouchableOpacity
                onPress={() => { setSaveType("ALL"); setShowSaveModal(true); }}
                activeOpacity={0.8}
              >
                <View style={{
                  backgroundColor: "#F97316",
                  borderRadius: 14, paddingVertical: 13,
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <Ionicons name="bookmark-outline" size={15} color="#fff" />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Lưu tất cả</Text>
                </View>
              </TouchableOpacity>
            </Reanimated.View>

            {/* Button 2 – Lưu X từ (slides in when words are selected) */}
            <Reanimated.View style={btn2Style}>
              <TouchableOpacity
                onPress={() => { setSaveType("SELECTED"); setShowSaveModal(true); }}
                activeOpacity={0.8}
              >
                <View style={{
                  backgroundColor: "#fff",
                  borderRadius: 14, paddingVertical: 13,
                  flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 6, borderWidth: 1.5, borderColor: "#F97316",
                  width: BTN_HALF,
                }}>
                  <Ionicons name="checkmark-circle" size={15} color="#F97316" />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#F97316" }} numberOfLines={1}>
                    Lưu {selected.length} từ
                  </Text>
                </View>
              </TouchableOpacity>
            </Reanimated.View>
          </View>
        </View>
      </View>

      <SaveToVocabModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        selectedCount={saveType === "ALL" ? total : selected.length}
      />
    </Modal>
  );
}
