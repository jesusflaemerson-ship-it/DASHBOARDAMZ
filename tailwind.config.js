/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0b0f",
        elev: "#101218",
        elev2: "#161923",
        border: "#22262f",
        bordersoft: "#1a1d26",
        text: "#e9ebf1",
        dim: "#9498a6",
        faint: "#5b6072",
        accent: "#6d5bff",
        good: "#33d69f",
        bad: "#ff5c72",
        warn: "#ffb547",
      },
      borderRadius: { xl2: "12px" },
    },
  },
  plugins: [],
};
