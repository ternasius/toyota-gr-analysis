/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        racing: {
          bg: '#0b0b0b',
          red: '#C8102E',
        },
      },
      fontFamily: {
        mono: ['Roboto Mono', 'Courier New', 'monospace'],
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
  // Production optimizations (Requirement 14.2)
  // Tailwind automatically purges unused styles in production based on content array
  // Additional safelist for dynamically generated classes if needed
  safelist: [
    // Add any dynamically generated classes here that shouldn't be purged
    // Example: 'bg-racing-red', 'text-racing-bg'
  ],
}
