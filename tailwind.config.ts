import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f7f7fb',
        ink: '#12131a',
        brand: '#4f46e5'
      }
    }
  },
  plugins: []
};

export default config;
