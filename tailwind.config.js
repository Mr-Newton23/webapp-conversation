/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    typography: require('./typography'),
    extend: {
      colors: {
        // Theme: the template's light palette is remapped to dark navy with bronze accents,
        // so existing utility classes (bg-white, text-gray-900, text-primary-600, ...) pick up the theme.
        white: '#0C152B',
        gray: {
          50: '#0A1224',
          100: '#0E1830',
          200: '#1E2C4D',
          300: '#2A3A61',
          400: '#6B7A9C',
          500: '#8C9AB8',
          600: '#A9B5CE',
          700: '#C7D0E2',
          800: '#DEE4F0',
          900: '#EEF1F7',
        },
        primary: {
          50: '#2A2015',
          100: '#382A19',
          200: '#5C4424',
          300: '#8A6635',
          600: '#C08B4E',
          700: '#DDAA6A',
        },
        blue: {
          500: '#1B2A4D',
        },
        navy: {
          950: '#060B18',
          900: '#0A1224',
          800: '#0C152B',
          700: '#121E3A',
          600: '#1E2C4D',
        },
        bronze: {
          300: '#E9C48F',
          400: '#DDAA6A',
          500: '#C08B4E',
          600: '#9A6D38',
          700: '#6E4D27',
        },
        green: {
          50: '#0F2A22',
          100: '#143A2D',
          800: '#8FE0BD',

        },
        yellow: {
          100: '#3A3212',
          800: '#F0D98A',
        },
        purple: {
          50: '#1A1836',
        },
        indigo: {
          25: '#0F1730',
          100: '#1A2548',
          600: '#8E9BFF',
        },
      },
      screens: {
        mobile: '100px',
        // => @media (min-width: 100px) { ... }
        tablet: '640px', // 391
        // => @media (min-width: 600px) { ... }
        pc: '769px',
        // => @media (min-width: 769px) { ... }
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
