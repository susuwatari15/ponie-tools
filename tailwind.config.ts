import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware neutrals + accent (RGB channels -> /alpha support).
        ink: 'rgb(var(--ink) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--surface-raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        // Static HTTP-method / diff signal colors (the brand spectrum).
        get: '#3DD68C',
        post: '#4EA1FF',
        put: '#F5A623',
        patch: '#FF8A5C',
        del: '#FF5C7A',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '0.875rem',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(18, 33, 72, 0.45)',
        card: '0 1px 2px rgba(15, 23, 41, 0.04), 0 8px 24px rgba(15, 23, 41, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
