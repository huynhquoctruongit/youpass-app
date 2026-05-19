import AxiosAPI from "./axios-client";

export type DevicePlatform = "ios" | "android" | "web";

export interface RegisterDeviceTokenPayload {
  token: string;
  platform: DevicePlatform;
  device_id?: string;
}

export const notificationsApi = {
  registerDeviceToken: async (payload: RegisterDeviceTokenPayload) => {
    const res = await AxiosAPI.post("/v1/users/me/devices", payload);
    return res.data?.data;
  },

  unregisterDeviceToken: async (token: string) => {
    const res = await AxiosAPI.delete(`/v1/users/me/devices/${encodeURIComponent(token)}`);
    return res.data?.data;
  },
};
