export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

export const getTheme = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

/** Keeps every toggle's accessible name describing the action it performs. */
const syncToggles = (theme: Theme): void => {
  const next: Theme = theme === "light" ? "dark" : "light";
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-label", `Switch to ${next} theme`);
  });
};

export const setTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode, blocked): the theme still applies to this view.
  }
  syncToggles(theme);
};

export const toggleTheme = (): void => setTheme(getTheme() === "light" ? "dark" : "light");

export const initThemeToggles = (): void => {
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });
  syncToggles(getTheme());
};
