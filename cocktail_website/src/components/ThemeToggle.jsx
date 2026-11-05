import { THEMES, THEME_ORDER, useTheme } from "../context/contexts";

export default function ThemeToggle({ showLabel = false }) {
  const { theme, cycleTheme } = useTheme();
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  const current = THEMES[theme];
  const label = `Theme: ${current.label}. Switch to ${THEMES[next].label}${THEMES[next].hint ? ` (${THEMES[next].hint})` : ""}`;

  return (
    <button type="button" className="icon-btn theme-toggle" onClick={cycleTheme} aria-label={label} title={label}>
      <i className={current.icon} aria-hidden="true" />
      {showLabel && <span className="theme-toggle__label">{current.label}</span>}
    </button>
  );
}
