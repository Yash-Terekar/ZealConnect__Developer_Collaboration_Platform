/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00ccff",
        primaryHover: "#0099cc",
        accent: "#0da9f1",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
