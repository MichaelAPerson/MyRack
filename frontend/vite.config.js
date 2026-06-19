import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `npm run dev` the dashboard runs on its own port (5173) while the
// hub API/Socket.io server runs on 4280. This proxy makes them look
// same-origin so the frontend code never has to care which mode it's in.
// In production the hub serves the built frontend directly, so there's no
// proxy involved at all - everything is already same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4280',
      '/socket.io': { target: 'http://localhost:4280', ws: true },
    },
  },
  build: {
    outDir: '../hub/public',
    emptyOutDir: true,
  },
});
