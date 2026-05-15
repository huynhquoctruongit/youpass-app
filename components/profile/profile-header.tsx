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

      <View className="flex-row gap-2 mt-3">
        {roleName ? (
          <View className="px-3 py-1 rounded-full bg-orange-100 border border-orange-200">
            <Text className="text-xs font-medium text-orange-600">{roleName}</Text>
          </View>
        ) : null}
        <View
          className={
            "px-3 py-1 rounded-full border " +
            (isUnlimited
              ? "bg-amber-50 border-amber-200"
              : "bg-neutral-50 border-neutral-200")
          }
        >
          <Text
            className={
              "text-xs font-medium " +
              (isUnlimited ? "text-amber-700" : "text-neutral-500")
            }
          >
            {isUnlimited ? "Unlimited" : "Free"}
          </Text>
        </View>
      </View>
    </View>
  );
}
