import { Image } from "expo-image";
import { Text, View } from "react-native";
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
    <View className="bg-white rounded-3xl p-6 items-center shadow-sm border border-neutral-100">
      <View className="relative">
        <Image
          source={{ uri: avatar }}
          style={{ width: 96, height: 96, borderRadius: 48 }}
          contentFit="cover"
        />
      </View>

      <Text className="text-t3-bold text-dark-75 mt-4" numberOfLines={1}>
        {fullName}
      </Text>
      <Text className="text-t4-regular text-dark-50 mt-1" numberOfLines={1}>
        {profile.email}
      </Text>
      {profile.phone_number && (
        <Text className="text-t4-regular text-teritary-06 mt-1" numberOfLines={1}>
          {profile.phone_number}
        </Text>
      )}
    </View>
  );
}
