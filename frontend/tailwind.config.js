/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light Mode Colors
        primary: "#6366f1",
        secondary: "#0891b2",
        accent: "#ec4899",

        // Dark Mode Will use dark: prefix in Tailwind
        dark: {
          primary: "#818cf8",
          secondary: "#06b6d4",
          accent: "#f472b6",
        },
      },
      backgroundColor: {
        light: "#f5f7fa",
        "light-secondary": "#e8ecf1",
        dark: "#0f1419",
        "dark-secondary": "#1a1f2e",
      },
      textColor: {
        light: "#1a202c",
        "light-secondary": "#4b5563",
        dark: "#e2e8f0",
        "dark-secondary": "#cbd5e1",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glass-light": "0 8px 32px rgba(0, 0, 0, 0.08)",
        "glass-dark": "0 8px 32px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
};
