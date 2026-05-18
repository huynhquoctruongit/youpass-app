/** @type {import('tailwindcss').Config} */
const { Colors, FontSizes } = require("./services/constant");

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: Colors,
      fontSize: FontSizes,
    },
  },
  plugins: [],
}

