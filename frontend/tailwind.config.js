/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bn: {
          forest: "#1B4332",
          leaf: "#2D6A4F",
          mint: "#95D5B2",
          cream: "#F8F9F3",
          ink: "#1a1f1c",
          warn: "#D4A373",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
