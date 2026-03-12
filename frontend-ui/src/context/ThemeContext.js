// frontend-ui/src/context/ThemeContext.js
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

// Apply theme to <html> immediately (called before React renders)
// This prevents any flash of wrong theme on load
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// Read saved theme synchronously — default to "light"
const savedTheme = localStorage.getItem("eengage_theme") || "light";
applyTheme(savedTheme); // apply before first paint

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(savedTheme);

  // After first mount, add theme-ready so CSS transitions activate
  useEffect(() => {
    // Small delay so initial paint completes before transitions turn on
    const t = setTimeout(() => {
      document.documentElement.classList.add("theme-ready");
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const toggle = () => {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      applyTheme(next);
      localStorage.setItem("eengage_theme", next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
