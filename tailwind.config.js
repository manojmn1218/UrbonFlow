/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chocolate: {
          50: '#FAF3ED',
          100: '#F1E3D9',
          200: '#DFC4B3',
          300: '#C49A80',
          400: '#9C6D52',
          500: '#7D5138',
          600: '#653D28',
          700: '#4E2E1E',
          800: '#482819ff',
          900: '#532c18ff',
          950: '#51301fea',
        },
        cream: {
          50: '#FFFDF9',
          100: '#FDFBF7',
          200: '#FAF6F0',
          300: '#F4ECE1',
          400: '#EADBCE',
          500: '#D6C2B0',
          600: '#BFA895',
        },
        caramel: {
          400: '#E08E45',
          500: '#C47D3B',
          600: '#A96529',
          700: '#8E511F',
        },
        brand: {
          50: '#FAF3ED',
          100: '#F1E3D9',
          200: '#DFC4B3',
          300: '#C49A80',
          400: '#9C6D52',
          500: '#7D5138',
          600: '#5C331E',
          700: '#532c1aff',
          800: '#472517ff',
          900: '#3b1f14ff',
          950: '#452012ff',
        },
        traffic: {
          free: '#2D6A4F',      // Forest Sage
          moderate: '#C47D3B',  // Caramel Amber
          heavy: '#D97706',     // Deep Amber
          severe: '#9E2A2B',    // Ruby Cocoa
        },
        surface: {
          bg: '#FAF6F0',
          card: '#FFFDF9',
          sidebar: '#FFFDF9',
          border: '#EADBCE',
          subtle: '#F4ECE1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(44, 24, 16, 0.04), 0 1px 2px rgba(44, 24, 16, 0.02)',
        'premium': '0 10px 25px -5px rgba(44, 24, 16, 0.06), 0 8px 10px -6px rgba(44, 24, 16, 0.03)',
        'float': '0 20px 35px -10px rgba(44, 24, 16, 0.10), 0 1px 3px rgba(44, 24, 16, 0.05)',
        'glow-chocolate': '0 0 20px rgba(78, 46, 30, 0.20)',
        'glow-caramel': '0 0 20px rgba(196, 125, 59, 0.25)',
        'glow-blue': '0 0 20px rgba(92, 51, 30, 0.15)',
        'glow-red': '0 0 20px rgba(158, 42, 43, 0.2)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
