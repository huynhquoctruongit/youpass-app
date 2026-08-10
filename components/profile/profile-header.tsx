import { Image } from "expo-image";
import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { UserProfile } from "@/contexts/auth-context";
import { getAvatarUrl, getFullName } from "@/services/helpers/user";

interface ProfileHeaderProps {
  profile: UserProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const fullName = getFullName(profile) || "Học viên YouPass";
  const avatar = getAvatarUrl(profile);
  const roleName = profile.role?.name;
  const isUnlimited = !!profile.user_subscription;

  return (
    <View>
      <View className="items-center" style={{ marginTop: 8 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            borderWidth: 4,
            borderColor: "#fff",
            backgroundColor: "#f5f5f5",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Image
            source={{ uri: avatar }}
            style={{ width: 80, height: 80, borderRadius: 40 }}
            contentFit="cover"
          />
        </View>

        <Text className="text-lg font-bold text-neutral-900 mt-3" numberOfLines={1}>
          {fullName}
        </Text>

        <View className="flex-row items-center gap-2 mt-1.5">
          {roleName && (
            <View className="rounded-full bg-orange-50 border border-orange-200 px-3 py-0.5">
              <Text className="text-xs font-semibold text-orange-600">
                {roleName}
              </Text>
            </View>
          )}
          {isUnlimited && (
            <View className="flex-row items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5">
              <Ionicons name="star" size={11} color="#d97706" />
              <Text className="text-xs font-semibold text-amber-700">
                {profile.user_subscription?.name ?? "Premium"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
