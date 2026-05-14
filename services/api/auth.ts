import AxiosAPI from "./axios-client";

export const authApi = {
  loginWithGoogle: async (accessToken: string) => {
    const res = await AxiosAPI.post("/v1/auth/google", { token: accessToken });
    return res.data?.data;
  },

  getProfile: async () => {
    const res = await AxiosAPI.get("/v1/users/me");
    return res.data?.data;
  },
};
