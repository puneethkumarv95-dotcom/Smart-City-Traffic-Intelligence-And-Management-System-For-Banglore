/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        city: {
          darkest: '#070b14',
          dark: '#0b1120',
          card: '#111b2e',
          surface: '#162238',
          border: '#1f2e4d',
          hover: '#243456'
        },
        electric: {
          light: '#38bdf8',
          DEFAULT: '#0284c7',
          dark: '#0369a1',
          cyan: '#06b6d4',
          glow: 'rgba(14, 165, 233, 0.15)'
        },
        traffic: {
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          purple: '#8b5cf6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}

