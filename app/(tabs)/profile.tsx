import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { LogoutButton } from "@/components/profile/logout-button";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileInfo } from "@/components/profile/profile-info";
import { useAuth } from "@/hooks/use-auth";

export default function ProfileScreen() {
  const { profile, isLoading, logout, getProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getProfile();
    } finally {
      setRefreshing(false);
    }
  }, [getProfile]);

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
            Không thể tải thông tin tài khoản. Vui lòng đăng nhập lại.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-neutral-50">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#f97316"
          />
        }
      >
        <Text className="text-2xl font-bold text-neutral-900 px-1">
          Hồ sơ của tôi
        </Text>

        <ProfileHeader profile={profile} />
        <ProfileInfo profile={profile} />
        <View className="mt-4">
          <LogoutButton onLogout={logout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
