import { createSafeContext } from "../lib/createSafeContext";

/* Context objects + hooks live here (no components), providers live in *Provider.jsx. */

export const THEMES = {
  light: { label: "Light", icon: "ri-sun-line" },
  dark: { label: "Dark", icon: "ri-moon-clear-line" },
  accessible: { label: "Accessible", icon: "ri-eye-line", hint: "high contrast, colour-blind safe, larger text" },
};
export const THEME_ORDER = Object.keys(THEMES);
export const THEME_STORAGE_KEY = "theme";

export const DIALOGS = {
  signIn: "sign-in",
  signUp: "sign-up",
  cart: "cart",
};

export const [ThemeContext, useTheme] = createSafeContext("Theme");
export const [AuthContext, useAuth] = createSafeContext("Auth");
export const [CartContext, useCart] = createSafeContext("Cart");
export const [DialogContext, useDialog] = createSafeContext("Dialog");
export const [ToastContext, useToast] = createSafeContext("Toast");
