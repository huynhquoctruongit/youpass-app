import { ComponentProps } from "react";
import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { UserProfile } from "@/contexts/auth-context";

interface ProfileInfoProps {
  profile: UserProfile;
}

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

interface InfoRow {
  icon: IoniconsName;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function ProfileInfo({ profile }: ProfileInfoProps) {
  const rows: InfoRow[] = [
    {
      icon: "mail",
      label: "Email",
      value: profile.email || "—",
      iconColor: "#3B82F6",
      iconBg: "#EFF6FF",
    },
    {
      icon: "call",
      label: "Số điện thoại",
      value: profile.phone_number || "—",
      iconColor: "#10B981",
      iconBg: "#ECFDF5",
    },
    {
      icon: "calendar",
      label: "Ngày tham gia",
      value: formatDate(profile.date_created),
      iconColor: "#8B5CF6",
      iconBg: "#F5F3FF",
    },
  ];

  return (
    <View className="bg-white rounded-3xl border border-neutral-100 overflow-hidden">
      <View className="px-5 pt-5 pb-1">
        <Text className="text-xs font-bold text-neutral-400 uppercase" style={{ letterSpacing: 1.5 }}>
          Thông tin
        </Text>
      </View>

      {rows.map((row, idx) => (
        <View key={row.label}>
          <View className="flex-row items-center gap-4 px-5 py-4">
            <View
              className="w-10 h-10 rounded-2xl items-center justify-center"
              style={{ backgroundColor: row.iconBg }}
            >
              <Ionicons name={row.icon} size={18} color={row.iconColor} />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-neutral-400 font-medium">
                {row.label}
              </Text>
              <Text
                className="text-sm font-semibold text-neutral-800 mt-0.5"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {row.value}
              </Text>
            </View>
          </View>
          {idx < rows.length - 1 && (
            <View className="h-px bg-neutral-100 ml-[76px]" />
          )}
        </View>
      ))}
    </View>
  );
}
