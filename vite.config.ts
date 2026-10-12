import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApi } from './server/vite-plugin.ts';

export default defineConfig({
  plugins: [react(), mockApi()],
});
