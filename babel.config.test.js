/**
 * Babel config used only by Jest (see jest.config.js).
 * Minimal preset to transform TypeScript + ESM imports for pure-logic tests,
 * avoiding the app's nativewind/reanimated plugins which need a native runtime.
 */
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
  ],
};
