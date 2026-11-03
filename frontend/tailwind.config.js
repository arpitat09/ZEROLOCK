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
        bg: {
          main: '#090B10',
          secondary: '#10141D',
          card: '#151B26',
          hover: '#1E2638',
        },
        accent: {
          primary: '#A78BFA',
          'primary-hover': '#9065F6',
          secondary: '#22D3EE',
          'secondary-hover': '#06B6D4',
        },
        status: {
          success: '#34D399',
          warning: '#FBBF24',
          error: '#F87171',
          info: '#38BDF8',
        },
        txt: {
          main: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        border: {
          dark: '#263244',
          light: '#334155',
          focus: '#A78BFA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(167, 139, 250, 0.3)',
        'glow-cyan': '0 0 20px -5px rgba(34, 211, 238, 0.3)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
