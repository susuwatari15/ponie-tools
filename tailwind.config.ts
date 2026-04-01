import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: '#070A14',
        panel: '#101A31',
        panelSoft: '#16223F',
        accent: '#24A3FF',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(18, 33, 72, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
