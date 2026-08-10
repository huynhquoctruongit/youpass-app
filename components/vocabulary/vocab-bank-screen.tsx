import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { ComponentProps, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  type VocabGroup,
  type VocabSet,
  type VocabSetStat,
  vocabularyApi,
} from "@/services/api/vocabulary";
import { SetDetailSheet } from "./vocab-set-detail";

const CMS_URL = process.env.EXPO_PUBLIC_CMS || "";
const { width: SW } = Dimensions.get("window");
// 2-column grid: 16px left + 10px gap + 16px right = 42px used
const CARD_W = (SW - 42) / 2;

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

// Palette for group tabs (cycles through)
const GROUP_PALETTE = ["#F97316", "#3B82F6", "#8B5CF6", "#10B981", "#F43F5E"];

// ─── Animated Press Wrapper ─────────────────────────────────────────────────

function PressScale({
  onPress,
  children,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={onPress}
    >
      <Reanimated.View style={[anim, style]}>{children}</Reanimated.View>
    </Pressable>
  );
}

// ─── Set Card (grid) ────────────────────────────────────────────────────────

function SetCard({
  set,
  stat,
  onPress,
  index,
}: {
  set: VocabSet;
  stat?: VocabSetStat;
  onPress: () => void;
  index: number;
}) {
  const saved = stat?.saved_words ?? 0;
  const total = stat?.total_words ?? set.total_words ?? 0;
  const pct = total > 0 ? Math.round((saved / total) * 100) : 0;
  const imageUrl = set.thumbnail ? `${CMS_URL}/assets/${set.thumbnail}` : null;
  const isStarted = saved > 0;

  return (
    <PressScale onPress={onPress} style={{ width: CARD_W }}>
      <View style={{
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}>
        {/* Thumbnail area */}
        <View style={{ width: CARD_W, height: CARD_W * 0.62, backgroundColor: "#FFF0E5" }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="book" size={26} color="#F97316" />
              </View>
            </View>
          )}

          {/* Word count badge */}
          <View style={{
            position: "absolute", top: 8, right: 8,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
            flexDirection: "row", alignItems: "center", gap: 3,
          }}>
            <Ionicons name="layers-outline" size={10} color="#fff" />
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{total}</Text>
          </View>

          {/* Saved indicator */}
          {isStarted && (
            <View style={{
              position: "absolute", top: 8, left: 8,
              backgroundColor: "#10B981",
              borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>{pct}%</Text>
            </View>
          )}

          {/* Progress bar at image bottom */}
          {isStarted && (
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, backgroundColor: "rgba(0,0,0,0.15)" }}>
              <View style={{ width: `${pct}%`, height: 3, backgroundColor: "#10B981" }} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ padding: 10, gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 }} numberOfLines={2}>
            {set.name}
          </Text>
          {isStarted ? (
            <Text style={{ fontSize: 11, color: "#10B981", fontWeight: "600" }}>{saved}/{total} đã lưu</Text>
          ) : (
            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Chưa học</Text>
          )}
        </View>
      </View>
    </PressScale>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export function VocabBankScreen() {
  const [groups, setGroups] = useState<VocabGroup[]>([]);
  const [stats, setStats] = useState<VocabSetStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<VocabSet | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [g, s] = await Promise.all([
        vocabularyApi.getGroups(),
        vocabularyApi.getSetStats(),
      ]);
      setGroups(g);
      setStats(s);
      if (g.length > 0 && !activeGroup) setActiveGroup(g[0].id);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const activeGroupData = groups.find((g) => g.id === activeGroup);
  const sets = activeGroupData?.sets ?? [];

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#F97316" size="large" />
        <Text style={{ marginTop: 12, fontSize: 14, color: "#9CA3AF" }}>Đang tải kho từ vựng...</Text>
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="library-outline" size={36} color="#F97316" />
        </View>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#374151", textAlign: "center" }}>Kho từ vựng trống</Text>
        <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
          Chưa có bộ từ vựng nào. Vui lòng thử lại sau.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Group tabs */}
      <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
          {groups.map((g, i) => {
            const color = GROUP_PALETTE[i % GROUP_PALETTE.length];
            const isActive = activeGroup === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => setActiveGroup(g.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 22,
                  backgroundColor: isActive ? color : "#F3F4F6",
                  borderWidth: 1,
                  borderColor: isActive ? color : "transparent",
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: isActive ? "700" : "500",
                  color: isActive ? "#fff" : "#6B7280",
                }}>
                  {g.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Set grid */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats summary */}
        {stats.length > 0 && (
          <View style={{
            backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 16,
            flexDirection: "row",
            borderWidth: 1, borderColor: "#E5E7EB",
          }}>
            {[
              { icon: "layers-outline" as IoniconsName, label: "Tổng chủ đề", value: sets.length, color: "#6B7280" },
              { icon: "bookmark" as IoniconsName, label: "Đã học", value: stats.filter((s) => s.saved_words > 0).length, color: "#10B981" },
            ].map((item, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center", flexDirection: "row", gap: 10, paddingHorizontal: 8 }}>
                {i > 0 && <View style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 1, backgroundColor: "#F3F4F6" }} />}
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{item.value}</Text>
                  <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{item.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 2-column grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {sets.map((set, i) => (
            <SetCard
              key={set.id}
              set={set}
              stat={stats.find((s) => s.set_id === set.id)}
              onPress={() => setSelectedSet(set)}
              index={i}
            />
          ))}
        </View>
      </ScrollView>

      {/* Detail sheet */}
      <SetDetailSheet
        set={selectedSet}
        stat={stats.find((s) => s.set_id === selectedSet?.id)}
        onClose={() => setSelectedSet(null)}
        onSaved={() => {
          fetchData();
          setSelectedSet(null);
        }}
      />
    </View>
  );
}
