/** @type {import('tailwindcss').Config} */
module.exports = {
  // Indique à Tailwind où trouver nos composants et nos écrans React Native
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/hooks/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#090A1A', // Fond sombre galactique
          light: '#F8FAFC',   // Fond clair (fallback)
        },
        card: {
          DEFAULT: '#131538', // Surface sombre transparente/verre
          light: '#FFFFFF',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#94A3B8',
          dark: '#0F172A',
        },
        brand: {
          primary: '#4F46E5',   // Indigo moderne
          secondary: '#06B6D4', // Cyan éclatant
          accent: '#8B5CF6',    // Violet
          gold: '#F59E0B',      // Doré pour XP & Badges
          emerald: '#10B981',   // Vert réussite
          rose: '#EF4444',      // Rouge échec
        }
      },
      fontFamily: {
        display: ['Spline Sans', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
