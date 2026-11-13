/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#10243A', 800: '#17324d', 700: '#1f3f5f', 600: '#2c5078' },
        brand: { DEFAULT: '#2563EB', 600: '#1d4ed8', 50: '#eff5ff', 100: '#dbe8ff' },
        teal: { DEFAULT: '#0D9488', 50: '#EAF5F3', 100: '#cdeae6', 700: '#0b766d' },
        surface: '#EAF5F3',
        bg: '#F5F7FA',
        danger: { DEFAULT: '#C62828', 50: '#fdecec' },
      },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,36,58,.06), 0 4px 14px rgba(16,36,58,.05)' },
    },
  },
  plugins: [],
};
