import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "auto";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "auto";
    const stored = window.localStorage.getItem("theme");
    return (stored as Theme) || "auto";
  });

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "auto" ? (prefersDark ? "dark" : "light") : theme;

    root.classList.remove("light", "dark");
    root.classList.add(resolved);

    if (theme === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }

    root.style.colorScheme = resolved;
  }, [theme]);

  return { theme, setTheme };
}
