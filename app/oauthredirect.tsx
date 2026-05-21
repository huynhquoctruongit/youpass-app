import { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import * as SecureStore from "expo-secure-store";
import * as AuthSession from "expo-auth-session";

const GOOGLE_TOKEN_DISCOVERY = {
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

export default function OAuthRedirect() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    state?: string;
  }>();
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const run = async () => {
      try {
        if (params.error) {
          throw new Error(params.error_description || params.error);
        }
        if (!params.code) {
          throw new Error("Missing authorization code");
        }

        const codeVerifier = await SecureStore.getItemAsync("oauth_code_verifier");
        const redirectUri = await SecureStore.getItemAsync("oauth_redirect_uri");
        if (!codeVerifier || !redirectUri) {
          throw new Error("Missing PKCE state. Vui lòng thử lại.");
        }

        const clientId =
          Platform.OS === "ios"
            ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
            : Platform.OS === "android"
              ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
              : process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

        if (!clientId) {
          throw new Error("Missing Google client ID for platform " + Platform.OS);
        }

        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId,
            code: params.code,
            redirectUri,
            extraParams: { code_verifier: codeVerifier },
          },
          GOOGLE_TOKEN_DISCOVERY,
        );

        await SecureStore.deleteItemAsync("oauth_code_verifier");
        await SecureStore.deleteItemAsync("oauth_redirect_uri");

        if (!tokenResponse.accessToken) {
          throw new Error("Không nhận được access token từ Google");
        }

        await loginWithGoogle(tokenResponse.accessToken);
        router.replace("/(tabs)");
      } catch (err: any) {
        console.log("[OAuthRedirect] error:", err);
        Alert.alert("Đăng nhập thất bại", err?.message ?? "Unknown error");
        router.replace("/(auth)/login");
      }
    };

    run();
  }, [params, router, loginWithGoogle]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#333" />
      <Text style={styles.text}>Đang xử lý đăng nhập...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  text: {
    fontSize: 14,
    color: "#555",
  },
});
