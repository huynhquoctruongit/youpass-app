import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { getDeviceId } from "@/services/helpers/device-id";
import { attachNetworkLogger } from "./network-logger";

const LORVAIX_BASE_URL =
  process.env.EXPO_PUBLIC_LORVAIX || "https://lorvaix-stg.youpass.vn";

// Axios instance cho Lorvaix (speaking transcript / submit / grade)
export const AxiosLorvaix = axios.create({
  baseURL: LORVAIX_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

AxiosLorvaix.interceptors.request.use(async (config) => {
  const [token, deviceId] = await Promise.all([
    SecureStore.getItemAsync("auth_token"),
    getDeviceId(),
  ]);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Device-Id"] = deviceId;
  return config;
});

AxiosLorvaix.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await SecureStore.deleteItemAsync("auth_token");
    }
    return Promise.reject(error);
  }
);

attachNetworkLogger(AxiosLorvaix, "Lorvaix");

export default AxiosLorvaix;
