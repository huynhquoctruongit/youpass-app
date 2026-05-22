import { Text, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { UserProfile } from "@/contexts/auth-context";

interface ProfileInfoProps {
  profile: UserProfile;
}

interface InfoRow {
  icon: Parameters<typeof IconSymbol>[0]["name"];
  label: string;
  value: string;
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

const buildRows = (profile: UserProfile): InfoRow[] => [
  {
    icon: "person.fill",
    label: "Họ và tên",
    value:
      profile.fullname ||
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
      "—",
  },
  { icon: "envelope.fill", label: "Email", value: profile.email || "—" },
  { icon: "phone.fill", label: "Số điện thoại", value: profile.phone_number || "—" },
];

export function ProfileInfo({ profile }: ProfileInfoProps) {
  const rows = buildRows(profile);

  return (
    <View className="bg-white rounded-3xl border border-neutral-100 shadow-sm">
      <View className="px-5 pt-5 pb-2">
        <Text className="text-base font-semibold text-neutral-900">
          Thông tin tài khoản
        </Text>
      </View>

      <View className="px-5 pb-2">
        {rows.map((row, idx) => (
          <View
            key={row.label}
            className={
              "flex-row items-center gap-3 py-3 " +
              (idx < rows.length - 1 ? "border-b border-neutral-100" : "")
            }
          >
            <View className="w-9 h-9 rounded-full bg-orange-50 items-center justify-center">
              <IconSymbol name={row.icon} size={18} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-neutral-500">{row.label}</Text>
              <Text
                className="text-sm text-neutral-900 mt-0.5"
                numberOfLines={1}
              >
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
