/* Mock native modules pulled in transitively by the API layer so that
   pure helper logic can be unit-tested without a native runtime. */

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("@/services/helpers/device-id", () => ({
  getDeviceId: jest.fn(async () => "test-device-id"),
}));

jest.mock("@/services/api/network-logger", () => ({
  attachNetworkLogger: jest.fn(),
}));
