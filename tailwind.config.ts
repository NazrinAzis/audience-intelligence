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
        "nz-bg": "#F9FAFB",
        "nz-bg-subtle": "#F3F4F6",
        "nz-sidebar": "#1A1F36",
        "nz-primary": "#00C9A7",
        "nz-primary-hover": "#00B396",
        "nz-primary-light": "#F0FDF9",
        "nz-primary-text": "#007A6E",
        "nz-accent": "#1A1F36",
        "nz-accent-hover": "#111427",
        "nz-green": "#10B981",
        "nz-teal": "#00C9A7",
        "nz-orange": "#F59E0B",
        "nz-purple": "#805AD5",
        "nz-text": "#1A1F36",
        "nz-text-body": "#374151",
        "nz-text-secondary": "#6B7280",
        "nz-text-muted": "#9CA3AF",
        "nz-border": "#E5E7EB",
        "nz-border-strong": "#D1D5DB",
        "nz-red": "#EF4444",
      },
      fontFamily: {
        heading: ["Sora", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      borderRadius: {
        card: "8px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
