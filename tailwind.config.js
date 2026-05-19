/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          black:  '#0a0a0a',
          dark:   '#111111',
          panel:  '#161616',
          border: 'rgba(255,255,255,0.07)',
          gold:   '#c9a84c',
          'gold-dim': '#8a6e2f',
          text:   '#e8e4dc',
          muted:  '#6b6560',
        },
      },
      fontFamily: {
        display: ['var(--font-bebas)'],
        mono:    ['var(--font-dm-mono)'],
        sans:    ['var(--font-dm-sans)'],
      },
    },
  },
  plugins: [],
}
