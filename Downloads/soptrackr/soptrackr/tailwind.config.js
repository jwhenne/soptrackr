/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
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
        },
        // Per-tenant theme colors. Default to Toyota (red + yellow).
        // Future: rooftops/orgs override these via CSS vars.
        oem: {
          red: '#CC0000',
          'red-dark': '#a30000',
          yellow: '#FFD700',
          'yellow-soft': '#FFFBEA',
          'yellow-border': '#e6c200',
        },
        // Status badge palettes (mirroring the existing app exactly)
        sop: {
          'ordered-bg': '#E6F1FB',     'ordered-fg': '#185FA5',
          'transit-bg': '#FAEEDA',     'transit-fg': '#633806',
          'arrived-bg': '#EAF3DE',     'arrived-fg': '#3B6D11',
          'notified-bg': '#EEEDFE',    'notified-fg': '#3C3489',
          'scheduled-bg': '#E1F5EE',   'scheduled-fg': '#085041',
          'installed-bg': '#F1EFE8',   'installed-fg': '#444441',
          'returned-bg': '#F1EFE8',    'returned-fg': '#444441',
          'complete-bg': '#EAF3DE',    'complete-fg': '#27500A',
          'staying-bg': '#EAF3DE',     'staying-fg': '#3B6D11',
          'not-staying-bg': '#FCEBEB', 'not-staying-fg': '#A32D2D',
          'unknown-bg': '#F1EFE8',     'unknown-fg': '#737373',
          'backordered-bg': '#EEEDFE', 'backordered-fg': '#3C3489',
        },
      },
      fontFamily: {
        // Marketing site keeps Inter (set in layout.tsx). The app uses Lexend.
        lexend: ['Lexend', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pulse-warn': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
      },
      animation: {
        'pulse-warn': 'pulse-warn 1.5s infinite',
      },
    },
  },
  plugins: [],
}
