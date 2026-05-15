import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WelcomeActions } from "@/components/welcome/welcome-actions";
import { WelcomeHero } from "@/components/welcome/welcome-hero";
import { useAuth } from "@/hooks/use-auth";

export default function WelcomeScreen() {
  const { profile, isLoading } = useAuth();

  if (isLoading && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-500 text-center">
            Vui lòng đăng nhập để bắt đầu hành trình của bạn.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-neutral-50">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <WelcomeHero profile={profile} />
        <WelcomeActions />
      </ScrollView>
    </SafeAreaView>
  );
}
