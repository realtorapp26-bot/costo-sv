import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Se sirve bajo guerrero-properties.com/panel/ (mismo proyecto Vercel que el
  // sitio público) — sin esto, los <script>/<link> del build apuntarían a "/"
  // y no cargarían.
  base: '/panel/',
  plugins: [react()],
  server: { port: 5173 },
});
