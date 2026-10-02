/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mismo navy/gold/rojo RE/MAX que el sitio público (ver --primary,
        // --gold, --accent en styles.css) -- antes el panel tenía su propio
        // azul genérico que no coincidía con la marca real.
        navy: {
          DEFAULT: '#0a0f1c',
          700: '#162032',
          900: '#060910',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#f3e5ab',
        },
        accent: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
