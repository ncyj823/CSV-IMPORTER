import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#F7F8FA", // page background — lightest
          900: "#FFFFFF", // card / panel background
          800: "#F1F3F6", // table header / subtle hover bg
          700: "#E3E6EC", // borders
          600: "#C9CFD9", // secondary borders + muted placeholder text
          400: "#6B7280", // muted labels / captions
          200: "#374151", // secondary body text
          50: "#12151C", // primary text — highest contrast
        },
        signal: {
          DEFAULT: "#0F9D8C",
          dim: "#0B7A6C",
          soft: "#E1F6F2",
        },
        amber: {
          DEFAULT: "#B45309",
          soft: "#FDF1DF",
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FDEBEB",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgba(16,24,40,0.04), 0 8px 20px -8px rgba(16,24,40,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
