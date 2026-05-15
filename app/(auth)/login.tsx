import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const { loginWithEmailPassword, loginWithGoogle } = useAuth();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();
  const isBackdoor = true

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  const handleLoginWithToken = useCallback(async (accessToken: string) => {
    setLoading(true);
    try {
      await loginWithGoogle(accessToken);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Đăng nhập thất bại", "Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, router]);

  useEffect(() => {
    if (response?.type === "success") {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) {
        handleLoginWithToken(accessToken);
      }
    } else if (response?.type === "error") {
      console.log("[GoogleAuth] error:", response.error, response.params);
      const message =
        (response.params as Record<string, string> | undefined)?.error_description ??
        (response.params as Record<string, string> | undefined)?.error ??
        response.error?.message ??
        "Unknown error";
      Alert.alert("Lỗi đăng nhập Google", message);
    }
  }, [handleLoginWithToken, response]);

  const handlePressLogin = async () => {
    if (request?.codeVerifier) {
      await SecureStore.setItemAsync("oauth_code_verifier", request.codeVerifier);
    }
    if (request?.redirectUri) {
      await SecureStore.setItemAsync("oauth_redirect_uri", request.redirectUri);
    }
    promptAsync();
  };

  const handleEmailLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setEmailError("");

    if (!normalizedEmail) {
      setEmailError("Vui lòng nhập email");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setEmailError("Email không hợp lệ");
      return;
    }
    if (password.length < 6) {
      setEmailError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setEmailLoading(true);
    try {
      await loginWithEmailPassword(normalizedEmail, password);
      router.replace("/(tabs)");
    } catch {
      setEmailError("Tài khoản hoặc mật khẩu không chính xác");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const domain = process.env.EXPO_PUBLIC_YOUPASS_DOMAIN || "https://youpass.vn";
    await Linking.openURL(`${domain}/auth/forgot-password`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>YouPass</Text>
        <Text style={styles.subtitle}>
          Đăng ký / Đăng nhập bằng cách chọn{"\n"}
          <Text style={styles.bold}>Đăng nhập với Google</Text>
        </Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handlePressLogin}
          disabled={!request || loading || emailLoading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#333" />
          ) : (
            <Image
              source={{ uri: "https://www.google.com/favicon.ico" }}
              style={styles.googleIcon}
            />
          )}
          <Text style={styles.googleButtonText}>Đăng nhập với Google</Text>
        </TouchableOpacity>

        {isBackdoor ? (
          <View style={styles.backdoorContainer}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Hoặc</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowEmailForm((value) => !value)}
            >
              <Text style={styles.emailToggle}>Đăng nhập với Email</Text>
            </TouchableOpacity>

            {showEmailForm ? (
              <View style={styles.emailForm}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!emailLoading}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="Email"
                  style={styles.input}
                  value={email}
                />
                <TextInput
                  autoCapitalize="none"
                  editable={!emailLoading}
                  onChangeText={setPassword}
                  placeholder="Mật khẩu"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
                {emailError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{emailError}</Text>
                  </View>
                ) : null}
                <TouchableOpacity activeOpacity={0.75} onPress={handleForgotPassword}>
                  <Text style={styles.forgotPassword}>Quên mật khẩu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={emailLoading}
                  onPress={handleEmailLogin}
                  style={[styles.emailLoginButton, emailLoading && styles.disabledButton]}
                >
                  {emailLoading ? <ActivityIndicator size="small" color="#fff" /> : null}
                  <Text style={styles.emailLoginButtonText}>Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: {
    fontWeight: "700",
    color: "#111",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: "#fff",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  backdoorContainer: {
    width: "100%",
    gap: 14,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    width: "100%",
  },
  divider: {
    backgroundColor: "#e5e5e5",
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: "#a3a3a3",
    fontSize: 13,
  },
  emailToggle: {
    color: "#737373",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  emailForm: {
    gap: 12,
    width: "100%",
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#e5e5e5",
    borderRadius: 14,
    borderWidth: 1,
    color: "#111",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  errorBox: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  errorText: {
    color: "#78350f",
    fontSize: 13,
    textAlign: "center",
  },
  forgotPassword: {
    color: "#f97316",
    fontSize: 14,
    textAlign: "right",
    textDecorationLine: "underline",
  },
  emailLoginButton: {
    alignItems: "center",
    backgroundColor: "#f97316",
    borderRadius: 50,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
    width: "100%",
  },
  disabledButton: {
    opacity: 0.7,
  },
  emailLoginButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
