import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VocabBankScreen } from "@/components/vocabulary/vocab-bank-screen";
import { MyVocabScreen } from "@/components/vocabulary/my-vocab-screen";

type Tab = "bank" | "mine";

export default function ExploreScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("bank");
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: insets.top + 8,
          paddingBottom: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: "#111827",
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          Từ vựng
        </Text>

        {/* Top tabs */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 4 }}>
          {(
            [
              { key: "bank", label: "Kho từ vựng" },
              { key: "mine", label: "Sổ của tôi" },
            ] as { key: Tab; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? "#F97316" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? "#F97316" : "#9CA3AF",
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === "bank" ? <VocabBankScreen /> : <MyVocabScreen />}
      </View>
    </View>
  );
}
