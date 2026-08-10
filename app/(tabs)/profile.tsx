import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { LogoutButton } from "@/components/profile/logout-button";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileInfo } from "@/components/profile/profile-info";
import { useAuth } from "@/hooks/use-auth";

function SubscriptionCard({ sub }: { sub: { id?: string; name?: string; expired_at?: string } }) {
  const expiry = sub.expired_at
    ? new Date(sub.expired_at).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <View className="rounded-3xl overflow-hidden border border-amber-200 bg-amber-50 p-5">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-2xl bg-amber-100 items-center justify-center">
          <Ionicons name="star" size={20} color="#D97706" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-medium text-amber-600">Gói hiện tại</Text>
          <Text className="text-sm font-bold text-amber-900 mt-0.5">
            {sub.name ?? "Premium"}
          </Text>
        </View>
        {expiry && (
          <View className="items-end">
            <Text className="text-xs text-amber-500">Hết hạn</Text>
            <Text className="text-xs font-semibold text-amber-700 mt-0.5">{expiry}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#f97316"
          />
        }
      >
        <ProfileHeader profile={profile} />
        <ProfileInfo profile={profile} />
        {profile.user_subscription && (
          <SubscriptionCard sub={profile.user_subscription} />
        )}
        <LogoutButton onLogout={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}
