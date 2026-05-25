import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface LogoutButtonProps {
  onLogout: () => Promise<void> | void;
}

export function LogoutButton({ onLogout }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const confirmLogout = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?",
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: handleLogout,
        },
      ],
    );
  };

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onLogout();
    } catch (error) {
      Alert.alert("Có lỗi xảy ra", "Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={confirmLogout}
      disabled={loading}
      activeOpacity={0.85}
      className="flex-row items-center justify-center gap-2 bg-white border border-red-200 rounded-full py-3.5 px-6"
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#dc2626" />
      ) : (
        <IconSymbol
          name="rectangle.portrait.and.arrow.right.fill"
          size={18}
          color="#dc2626"
        />
      )}
      <Text className="text-red-600 font-semibold text-base" numberOfLines={1} style={{ flexShrink: 0 }}>Đăng xuất</Text>
    </TouchableOpacity>
  );
}
