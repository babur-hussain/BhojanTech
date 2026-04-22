/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: '#FF9933',
        maroon: '#800000',
        turmeric: '#FFC300',
        cream: '#FFF8F0',
        brand: {
          50:  '#fff8f0',
          100: '#ffe8cc',
          200: '#ffd099',
          300: '#ffb866',
          400: '#ff9933',
          500: '#FF9933',
          600: '#800000',
          700: '#660000',
          800: '#4d0000',
          900: '#330000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
