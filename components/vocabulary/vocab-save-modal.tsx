import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type VocabCategory, vocabularyApi } from "@/services/api/vocabulary";

const { height: SH } = Dimensions.get("window");

interface SaveToVocabModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (categoryCode: string) => Promise<void>;
  selectedCount: number;
}

export function SaveToVocabModal({
  visible,
  onClose,
  onSave,
  selectedCount,
}: SaveToVocabModalProps) {
  const [categories, setCategories] = useState<VocabCategory[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setNewName("");
      setShowInput(false);
      vocabularyApi.getCategories().then(setCategories).catch(() => {});
    }
  }, [visible]);

  const handleSave = async () => {
    let code = selected;
    if (!code) return;
    setSaving(true);
    try {
      if (code === "__new__") {
        if (!newName.trim()) return;
        const cat = await vocabularyApi.createCategory(newName.trim());
        code = cat.code;
      }
      await onSave(code);
      onClose();
    } catch {
      Alert.alert("Lỗi", "Lưu từ vựng thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = selected && (selected !== "__new__" || newName.trim().length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View style={{
          height: SH * 0.58,
          backgroundColor: "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}>
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 10 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
            borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
          }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>Lưu vào sổ</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{selectedCount} từ được chọn</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Tạo sổ mới */}
            <TouchableOpacity
              onPress={() => {
                const next = !showInput;
                setShowInput(next);
                setSelected(next ? "__new__" : null);
              }}
              activeOpacity={0.7}
            >
              <View style={{
                flexDirection: "row", alignItems: "center",
                paddingHorizontal: 20, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
                gap: 12,
              }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: "#FFF7ED",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name={showInput ? "remove" : "add"} size={18} color="#F97316" />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#F97316" }}>
                  Tạo sổ mới
                </Text>
                <Ionicons name={showInput ? "chevron-up" : "chevron-forward"} size={15} color="#D1D5DB" />
              </View>
            </TouchableOpacity>

            {showInput && (
              <View style={{
                paddingHorizontal: 20, paddingVertical: 12,
                backgroundColor: "#FFFBF5",
                borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
              }}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Nhập tên sổ..."
                  autoFocus
                  placeholderTextColor="#C4C4C4"
                  style={{
                    borderWidth: 1.5, borderColor: "#F97316", borderRadius: 10,
                    paddingHorizontal: 14, paddingVertical: 10,
                    fontSize: 14, color: "#111827", backgroundColor: "#fff",
                  }}
                />
              </View>
            )}

            {/* Category rows */}
            {categories.map((cat) => {
              const isActive = selected === cat.code;
              return (
                <TouchableOpacity
                  key={cat.code}
                  onPress={() => setSelected(cat.code)}
                  activeOpacity={0.65}
                >
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 14,
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
                    backgroundColor: isActive ? "#FFF7ED" : "#fff",
                  }}>
                    <Text style={{
                      flex: 1, fontSize: 14,
                      fontWeight: isActive ? "700" : "400",
                      color: isActive ? "#F97316" : "#374151",
                    }}>
                      {cat.name}
                    </Text>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isActive ? "#F97316" : "#D1D5DB",
                      backgroundColor: isActive ? "#F97316" : "#fff",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {isActive && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Save button */}
          <View style={{
            paddingHorizontal: 16, paddingVertical: 14,
            paddingBottom: insets.bottom + 14,
            borderTopWidth: 1, borderTopColor: "#F3F4F6",
          }}>
            <TouchableOpacity onPress={handleSave} disabled={!canSave || saving} activeOpacity={0.8}>
              <View style={{
                backgroundColor: canSave && !saving ? "#F97316" : "#E5E7EB",
                borderRadius: 14, paddingVertical: 14,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="bookmark" size={15} color={canSave ? "#fff" : "#9CA3AF"} />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: canSave ? "#fff" : "#9CA3AF" }}>
                      Lưu vào sổ
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
