/**
 * Theme handling. With no stored choice the site follows the OS (light or
 * dark, and it switches live, e.g. with macOS "Auto" appearance). Using the
 * toggle stores an explicit choice; "system" clears it again.
 *
 * The pre-paint script in BaseLayout applies the same rules before first paint.
 */
export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "theme";
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

const readStored = (): Theme | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // Storage unavailable (private mode, blocked).
  }
};

const systemTheme = (): Theme => (darkQuery().matches ? "dark" : "light");

export const getTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

/** Keeps every toggle's accessible name describing the action it performs. */
const syncToggles = (theme: Theme): void => {
  const next: Theme = theme === "light" ? "dark" : "light";
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-label", `Switch to ${next} theme`);
  });
};

const apply = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  syncToggles(theme);
};

export const setTheme = (preference: ThemePreference): void => {
  try {
    if (preference === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage unavailable: the theme still applies to this page view.
  }
  apply(preference === "system" ? systemTheme() : preference);
};

export const toggleTheme = (): void => setTheme(getTheme() === "light" ? "dark" : "light");

export const initThemeToggles = (): void => {
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });
  // Follow the OS live unless the visitor has made an explicit choice.
  darkQuery().addEventListener("change", () => {
    if (!readStored()) apply(systemTheme());
  });
  syncToggles(getTheme());
};
