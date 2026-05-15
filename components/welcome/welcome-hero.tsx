import { Image } from "expo-image";
import { Text, View } from "react-native";
import type { UserProfile } from "@/contexts/auth-context";
import {
  getAvatarUrl,
  getFullName,
  getGreetingByHour,
} from "@/services/helpers/user";

interface WelcomeHeroProps {
  profile: UserProfile;
}

export function WelcomeHero({ profile }: WelcomeHeroProps) {
  const greeting = getGreetingByHour();
  const displayName = getFullName(profile) || "bạn";
  const avatar = getAvatarUrl(profile);

  return (
    <View className="rounded-3xl overflow-hidden bg-orange-500 p-6">
      <View className="flex-row items-center gap-4">
        <Image
          source={{ uri: avatar }}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 3,
            borderColor: "rgba(255,255,255,0.8)",
          }}
          contentFit="cover"
        />
        <View className="flex-1">
          <Text className="text-white/80 text-xs uppercase tracking-widest">
            {greeting}
          </Text>
          <Text
            className="text-white text-xl font-bold mt-1"
            numberOfLines={2}
          >
            Chào mừng {displayName}!
          </Text>
        </View>
      </View>

      <Text className="text-white/90 text-sm mt-4 leading-5">
        Sẵn sàng chinh phục IELTS hôm nay chưa? Hãy bắt đầu luyện tập, theo dõi
        tiến độ và khám phá những bài tập mới dành riêng cho bạn.
      </Text>
    </View>
  );
}
