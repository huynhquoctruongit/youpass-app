import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface FeatureCardProps {
  title: string;
  description: string;
  badge?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  bg: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}

function FeatureCard({
  title,
  description,
  badge,
  icon,
  bg,
  iconBg,
  iconColor,
  onPress,
}: FeatureCardProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      style={({ pressed }) => ({ opacity: pressed ? 0.93 : 1 })}
    >
      <View
        className="rounded-3xl p-5 overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            {badge && (
              <View className="self-start rounded-full bg-white/30 px-3 py-0.5 mb-3">
                <Text className="text-xs font-semibold" style={{ color: iconColor }}>
                  {badge}
                </Text>
              </View>
            )}
            <Text className="text-xl font-bold text-neutral-900 leading-tight">
              {title}
            </Text>
            <Text className="text-sm text-neutral-500 mt-2 leading-5">
              {description}
            </Text>
            <View
              className="self-start mt-4 flex-row items-center gap-1.5 rounded-full px-4 py-2"
              style={{ backgroundColor: iconColor }}
            >
              <Text className="text-white text-sm font-semibold">Học ngay</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>

          <View
            className="w-16 h-16 rounded-2xl items-center justify-center"
            style={{ backgroundColor: iconBg }}
          >
            <Ionicons name={icon} size={32} color={iconColor} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function WelcomeActions() {
  const router = useRouter();

  return (
    <View className="gap-4">
      <FeatureCard
        title="Sổ từ vựng"
        description="Ôn luyện từ vựng IELTS, tra nghĩa và lưu từ yêu thích của bạn"
        badge="Từ vựng"
        icon="book"
        bg="#FFF7ED"
        iconBg="#FFEDD5"
        iconColor="#F97316"
        onPress={() => router.push("/(tabs)/explore" as never)}
      />

      <FeatureCard
        title="Tiến độ học"
        description="Theo dõi roadmap, bài học tiếp theo và lịch sử hoàn thành"
        badge="Lộ trình"
        icon="bar-chart"
        bg="#F0F9FF"
        iconBg="#E0F2FE"
        iconColor="#0284C7"
        onPress={() => router.push("/(tabs)/my-progress" as never)}
      />
    </View>
  );
}
