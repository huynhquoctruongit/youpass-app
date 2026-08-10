import axios from "axios";
import * as SecureStore from "expo-secure-store";

const CMS_BASE_URL = process.env.EXPO_PUBLIC_CMS || "";

export const CmsAPI = axios.create({
  baseURL: CMS_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

CmsAPI.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default CmsAPI;
