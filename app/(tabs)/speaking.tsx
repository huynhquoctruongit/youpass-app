import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SpeakingListScreen } from "@/components/speaking/speaking-list-screen";

export default function SpeakingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: insets.top + 10,
          paddingBottom: 14,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#0F172A",
            letterSpacing: -0.3,
          }}
        >
          Speaking
        </Text>
        <Text style={{ marginTop: 3, fontSize: 13, color: "#64748B" }}>
          Chọn topic và luyện Speaking AI
        </Text>
      </View>

      <SpeakingListScreen />
    </View>
  );
}
