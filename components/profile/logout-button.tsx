import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

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
        { text: "Đăng xuất", style: "destructive", onPress: handleLogout },
      ],
    );
  };

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onLogout();
    } catch {
      Alert.alert("Có lỗi xảy ra", "Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={confirmLogout}
      disabled={loading}
      activeOpacity={0.82}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        opacity: loading ? 0.65 : 1,
        backgroundColor: "#EF4444",
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <View className="flex-row items-center justify-center gap-2.5 py-4">
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        )}
        <Text
          className="text-white font-bold text-base"
          numberOfLines={1}
          style={{ flexShrink: 0 }}
        >
          Đăng xuất
        </Text>
      </View>
    </TouchableOpacity>
  );
}
