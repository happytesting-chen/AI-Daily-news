/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f5f7fb",
        foreground: "#0f172a",
        card: "rgba(255,255,255,0.88)",
        border: "rgba(148,163,184,0.18)",
        primary: {
          DEFAULT: "#6366f1",
          foreground: "#ffffff"
        },
        muted: {
          DEFAULT: "#eef2ff",
          foreground: "#64748b"
        },
        accent: {
          blue: "#60a5fa",
          purple: "#a78bfa",
          green: "#34d399",
          amber: "#fbbf24",
          rose: "#fb7185"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        xl: "1rem",
        '2xl': "1.5rem"
      }
    }
  },
  plugins: []
};
