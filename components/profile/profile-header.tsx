import type { UserProfile } from "@/contexts/auth-context";
import { getAvatarUrl, getFullName } from "@/services/helpers/user";
import { Image } from "expo-image";
import { Text, View } from "react-native";

interface ProfileHeaderProps {
  profile: UserProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const fullName = getFullName(profile) || "Học viên YouPass";
  const avatar = getAvatarUrl(profile);
  const { phone_number } = profile;
  const isUnlimited = !!profile.user_subscription;
  return (
    <View className="bg-white rounded-3xl p-6 items-center shadow-sm border border-neutral-100">
      <View className="relative">
        <Image
          source={{ uri: avatar }}
          style={{ width: 96, height: 96, borderRadius: 48 }}
          contentFit="cover"
        />
        {isUnlimited && (
          <View className="absolute -bottom-1 right-0 bg-amber-400 rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-bold text-white">PRO</Text>
          </View>
        )}
      </View>

      <Text className="text-xl font-bold text-neutral-900 mt-4" numberOfLines={1}>
        {fullName}
      </Text>
      <Text className="text-sm text-neutral-500 mt-1" numberOfLines={1}>
        {profile.email}
      </Text>
      {phone_number && (
        <Text className="text-t3-regular text-teritary-06 mt-1" numberOfLines={1}>
          {phone_number}
        </Text>
      )}
    </View>
  );
}
