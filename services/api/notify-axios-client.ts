import axios from "axios";

const NOTIFY_API_BASE_URL = process.env.EXPO_PUBLIC_NOTIFY_API || "";
const NOTIFY_API_KEY = process.env.EXPO_PUBLIC_NOTIFY_API_KEY || "";

export const NotifyAPI = axios.create({
  baseURL: NOTIFY_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": NOTIFY_API_KEY,
  },
});

export default NotifyAPI;
