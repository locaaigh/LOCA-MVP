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
        // Sombras en capas, muy suaves (look SaaS premium)
        card: "0 1px 1px rgba(16,24,40,0.03), 0 8px 24px -16px rgba(16,24,40,0.12), 0 24px 56px -32px rgba(16,24,40,0.14)",
        lift: "0 10px 24px -10px rgba(219,39,119,0.28), 0 24px 60px -30px rgba(219,39,119,0.30)",
        pop: "0 24px 70px -20px rgba(16,24,40,0.22)",
        // Glow rosa muy sutil para CTAs / cards protagonistas
        glow: "0 0 0 1px rgba(244,114,182,0.16), 0 14px 40px -18px rgba(236,72,153,0.32)",
        "glow-lima": "0 0 0 1px rgba(132,204,22,0.20), 0 14px 40px -18px rgba(132,204,22,0.30)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
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
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "orb-drift": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(10px,-12px) scale(1.06)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1)",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.35s cubic-bezier(0.16,1,0.3,1)",
        float: "float 5s ease-in-out infinite",
        "orb-drift": "orb-drift 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
