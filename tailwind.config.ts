import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        loca: {
          // Rosa / magenta principal
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
        },
        lima: {
          // Verde lima de acento
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#bef264",
          400: "#a3e635",
          500: "#84cc16",
          600: "#65a30d",
          700: "#4d7c0f",
        },
        ink: {
          DEFAULT: "#18181b",
          soft: "#27272a",
          muted: "#52525b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.03)",
        card: "0 1px 2px rgba(16,24,40,0.03), 0 18px 40px -24px rgba(16,24,40,0.14)",
        lift: "0 12px 40px -12px rgba(219,39,119,0.22)",
        pop: "0 24px 60px -16px rgba(16,24,40,0.20)",
        // Glow rosa muy sutil para CTAs / cards protagonistas
        glow: "0 0 0 1px rgba(244,114,182,0.18), 0 20px 50px -18px rgba(236,72,153,0.30)",
        "glow-lima": "0 0 0 1px rgba(132,204,22,0.20), 0 18px 44px -18px rgba(132,204,22,0.28)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1)",
        "fade-in": "fade-in 0.4s ease-out",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
