import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "nz-bg": "#F5F6F8",
        "nz-sidebar": "#16161E",
        "nz-primary": "#4F46E5",
        "nz-primary-hover": "#4338CA",
        "nz-green": "#22C55E",
        "nz-teal": "#22C55E",
        "nz-orange": "#F6A623",
        "nz-purple": "#805AD5",
        "nz-text": "#111827",
        "nz-text-body": "#374151",
        "nz-text-secondary": "#6B7280",
        "nz-text-muted": "#9CA3AF",
        "nz-border": "#E5E7EB",
        "nz-border-strong": "#E5E7EB",
        "nz-red": "#EF4444",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
