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
          50: '#FAF8F5',
          100: '#F4EFE9',
          200: '#E5DCD3',
          300: '#CBBFB4',
          400: '#A7978A',
          500: '#837367',
          600: '#64564B',
          700: '#4C4138',
          800: '#362E28',
          900: '#231E1A',
          950: '#181512',
        },
        cream: {
          50: '#FFFFFF',
          100: '#FCFBF9',
          200: '#F9F7F4',
          300: '#F3EFE9',
          400: '#E8E2D9',
          500: '#D5CCC0',
          600: '#B8ADA0',
        },
        caramel: {
          400: '#C87A46',
          500: '#A86032',
          600: '#8E4F28',
          700: '#723E1E',
        },
        brand: {
          50: '#FAF8F5',
          100: '#F4EFE9',
          200: '#E5DCD3',
          300: '#CBBFB4',
          400: '#A7978A',
          500: '#837367',
          600: '#64564B',
          700: '#4C4138',
          800: '#362E28',
          900: '#231E1A',
          950: '#181512',
        },
        traffic: {
          free: '#2D6A4F',      // Clean Forest Sage
          moderate: '#A86032',  // Refined Amber Mocha
          heavy: '#C25E2E',     // Soft Warm Ochre
          severe: '#B91C1C',    // Crisp Crimson
        },
        surface: {
          bg: '#F9F8F6',
          card: '#FFFFFF',
          sidebar: '#FFFFFF',
          border: '#E8E2D9',
          subtle: '#F3EFE9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(28, 25, 23, 0.04)',
        'premium': '0 8px 24px -4px rgba(28, 25, 23, 0.05), 0 2px 6px -2px rgba(28, 25, 23, 0.03)',
        'float': '0 16px 32px -8px rgba(28, 25, 23, 0.08), 0 2px 6px rgba(28, 25, 23, 0.03)',
        'glow-chocolate': '0 0 20px rgba(54, 46, 40, 0.10)',
        'glow-caramel': '0 0 20px rgba(168, 96, 50, 0.15)',
        'glow-blue': '0 0 20px rgba(76, 65, 56, 0.12)',
        'glow-red': '0 0 20px rgba(185, 28, 28, 0.15)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
