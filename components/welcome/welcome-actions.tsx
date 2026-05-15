import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

type IconName = Parameters<typeof IconSymbol>[0]["name"];

interface WelcomeAction {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  route: string;
  color: string;
  bg: string;
}

const actions: WelcomeAction[] = [
  {
    id: "my-progress",
    title: "Tiến độ học",
    description: "Xem roadmap, bài tiếp theo và reflection",
    icon: "calendar",
    route: "/(tabs)/my-progress",
    color: "#f97316",
    bg: "#fff7ed",
  },
  {
    id: "reading",
    title: "Reading",
    description: "Luyện đọc với kho đề phong phú",
    icon: "book.fill",
    route: "/(tabs)/explore",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    id: "listening",
    title: "Listening",
    description: "Nghe – chép – hiểu sâu",
    icon: "headphones",
    route: "/(tabs)/explore",
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    id: "writing",
    title: "Writing",
    description: "Chấm bài tự động với AI",
    icon: "pencil.and.outline",
    route: "/(tabs)/explore",
    color: "#9333ea",
    bg: "#faf5ff",
  },
  {
    id: "speaking",
    title: "Speaking",
    description: "Luyện nói với feedback chi tiết",
    icon: "mic.fill",
    route: "/(tabs)/explore",
    color: "#f97316",
    bg: "#fff7ed",
  },
];

export function WelcomeActions() {
  const router = useRouter();

  return (
    <View>
      <Text className="text-base font-semibold text-neutral-900 mb-3">
        Bắt đầu nào
      </Text>
      <View className="flex-row flex-wrap -mx-1.5">
        {actions.map((action) => (
          <View key={action.id} className="w-1/2 px-1.5 mb-3">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(action.route as never)}
              className="bg-white rounded-2xl p-4 border border-neutral-100"
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mb-3"
                style={{ backgroundColor: action.bg }}
              >
                <IconSymbol name={action.icon} size={22} color={action.color} />
              </View>
              <Text className="text-neutral-900 font-semibold">
                {action.title}
              </Text>
              <Text
                className="text-neutral-500 text-xs mt-1 leading-4"
                numberOfLines={2}
              >
                {action.description}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}
