const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./actions/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        foreground: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        ring: "var(--accent)",
        status: {
          approved: "var(--status-approved)",
          referred: "var(--status-referred)",
          declined: "var(--status-declined)",
          processing: "var(--status-processing)",
          draft: "var(--status-draft)",
        },
      },
      borderRadius: {
        card: "12px",
        button: "8px",
      },
      fontFamily: {
        body: ["var(--font-dm-sans)", "sans-serif"],
        heading: ["var(--font-syne)", "sans-serif"],
      },
      width: {
        sidebar: "240px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
    },
  },
};

export default config;
