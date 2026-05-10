/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gelo: '#F5F4F0',
        bege: {
          DEFAULT: '#EDE8DF',
          light: '#F5F1EB',
        },
        borda: '#DDD9D0',
        acento: {
          DEFAULT: '#3D6B9E',
          escuro: '#2D5075',
          claro: '#EBF0F8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
