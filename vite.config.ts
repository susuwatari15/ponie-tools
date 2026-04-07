import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /** Project `asset/` folder is copied to site root (favicons, web manifest). */
  publicDir: 'asset',
  server: {
    port: 5174,
  },
});
