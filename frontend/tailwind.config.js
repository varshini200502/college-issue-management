/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        status: {
          new: '#3b82f6',
          assigned: '#8b5cf6',
          inprogress: '#f59e0b',
          waiting: '#eab308',
          onhold: '#6b7280',
          resolved: '#10b981',
          closed: '#047857',
          reopened: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
