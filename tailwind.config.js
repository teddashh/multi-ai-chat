/** @type {import('tailwindcss').Config} */

// 色階改走 CSS 變數，深色模式在 styles.css 翻轉變數即可，元件不用逐一加 dark: 變體
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const scale = (name) =>
  Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        slate: scale('slate'),
        sky: scale('sky'),
        white: 'rgb(var(--surface) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
