/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic surface tokens ──────────────────────────────────────
        surface: {
          base:   '#111827', // gray-900  — modal / page bg
          raised: '#1f2937', // gray-800  — panels / sidebars
        },
        // ── Brand accent ─────────────────────────────────────────────────
        accent: {
          DEFAULT: '#ea580c', // orange-600
          soft:    '#f97316', // orange-500
          muted:   '#fb923c', // orange-400
          focus:   '#f87171', // red-400   — input focus ring
        },
        // ── Status ───────────────────────────────────────────────────────
        status: {
          success: '#4ade80', // green-400
          warn:    '#fb923c', // orange-400
          error:   '#f87171', // red-400
        },
      },
      animation: {
        'in': 'slideIn 0.3s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}