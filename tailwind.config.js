/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
        amiri: ['Amiri', 'serif'],
        aref: ['Aref Ruqaa', 'serif'],
      },
    },
  },
  plugins: [],
}
