/**
 * Lightweight Jest config for PURE logic unit tests (no React/native runtime).
 * We intentionally avoid the `jest-expo` preset because its native setup
 * eagerly imports `expo-modules-core` .ts sources that don't transform in a
 * plain Node test env. The Speaking helpers under test are pure functions,
 * so a babel transform + node environment is all we need.
 */
module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      { configFile: "./babel.config.test.js" },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!(axios)/)"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  clearMocks: true,
};
