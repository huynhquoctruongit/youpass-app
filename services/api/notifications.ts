import NotifyAPI from "./notify-axios-client";

export type DevicePlatform = "ios" | "android" | "web";

export interface RegisterDeviceTokenPayload {
  user_id: string;
  token: string;
  platform: DevicePlatform;
}

export const notificationsApi = {
  registerDeviceToken: async (payload: RegisterDeviceTokenPayload) => {
    const res = await NotifyAPI.post("/v1/devices", payload);
    return res.data?.data;
  },

  unregisterDeviceToken: async (token: string) => {
    const res = await NotifyAPI.delete(`/v1/devices/${encodeURIComponent(token)}`);
    return res.data?.data;
  },
};
