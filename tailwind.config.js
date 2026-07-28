/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-text":
          "linear-gradient(45deg, #a163f1, #6363f1 22%,rgb(89, 177, 254) 40%, #40dfa3 67%, rgba(64, 223, 163, 0))",
      },
    },
  },
  darkMode: "class",
};

module.exports = config;
