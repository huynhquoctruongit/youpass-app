import type { AxiosInstance } from "axios";

const truncate = (value: unknown, max = 20000) => {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    if (!text) return value;
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return value;
  }
};

export const attachNetworkLogger = (client: AxiosInstance, label: string) => {
  if (!__DEV__) return;

  client.interceptors.request.use((config) => {
    const method = (config.method ?? "get").toUpperCase();
    const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
    console.log(`[API:${label}] → ${method} ${url}`, {
      params: config.params,
      data: truncate(config.data),
    });
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const method = (response.config.method ?? "get").toUpperCase();
      const url = `${response.config.baseURL ?? ""}${response.config.url ?? ""}`;
      console.log(`[API:${label}] ← ${response.status} ${method} ${url}`, {
        data: truncate(response.data),
      });
      return response;
    },
    (error) => {
      const config = error?.config;
      const method = (config?.method ?? "get").toUpperCase();
      const url = `${config?.baseURL ?? ""}${config?.url ?? ""}`;
      console.log(`[API:${label}] ✕ ${error?.response?.status ?? "ERR"} ${method} ${url}`, {
        message: error?.message,
        data: truncate(error?.response?.data),
      });
      return Promise.reject(error);
    },
  );
};
