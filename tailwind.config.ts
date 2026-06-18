import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: '#1F3348',
        gold: '#C8973A',
      },
      fontFamily: {
        sans:    ['var(--font-josefin)', 'ui-sans-serif', 'system-ui'],
        serif:   ['var(--font-crimson)', 'ui-serif', 'Georgia'],
        josefin: ['var(--font-josefin)', 'ui-sans-serif'],
        crimson: ['var(--font-crimson)', 'ui-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
