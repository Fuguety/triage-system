export const SITE_PROFILE_KEY = "triage-site-profile"
export const SITE_THEME_KEY = "triage-site-theme"
export const ACCESSIBILITY_MODE_KEY = "triage-accessibility-mode"
export const DEFAULT_ACCESSIBILITY_MODE = "default"

export const ACCESSIBILITY_MODE_LABELS =
{
  default: "Default",
  dark: "Dark",
  high_contrast: "High Contrast",
  dyslexia: "Dyslexia-Friendly"
}

const ACCESSIBILITY_CLASS_NAMES =
[
  "accessibility-dark",
  "accessibility-high-contrast",
  "accessibility-dyslexia"
]

const ACCESSIBILITY_MODE_VARIABLES =
{
  dark:
  {
    "--bg": "#101820",
    "--bg-accent": "#162230",
    "--surface": "rgba(22, 34, 48, 0.98)",
    "--surface-strong": "#1B2A38",
    "--text": "#F4F8FB",
    "--muted": "#C8D4DF",
    "--line": "#4B6072",
    "--primary": "#4EA3FF",
    "--primary-hover": "#7CB7FF",
    "--secondary": "#26394C",
    "--secondary-hover": "#31475D",
    "--shadow": "0 18px 50px rgba(0, 0, 0, 0.35)"
  },
  high_contrast:
  {
    "--bg": "#000000",
    "--bg-accent": "#000000",
    "--surface": "#FFFFFF",
    "--surface-strong": "#FFFFFF",
    "--text": "#000000",
    "--muted": "#111111",
    "--line": "#000000",
    "--primary": "#005FCC",
    "--primary-hover": "#003F88",
    "--secondary": "#FFFFFF",
    "--secondary-hover": "#E8E8E8",
    "--shadow": "none"
  }
}

export const DEFAULT_THEME =
{
  background: "#F5F7FA",
  card: "#FFFFFF",
  text: "#1A1A1A",
  muted: "#5D6A76",
  primary: "#1976D2",
  radius: 24
}



export function getStoredTheme()
{
  const value = localStorage.getItem(SITE_THEME_KEY)

  return value ? JSON.parse(value) : DEFAULT_THEME
}



export function applyTheme(theme)
{
  const root = document.documentElement

  root.style.setProperty("--bg", theme.background)
  root.style.setProperty("--surface", theme.card)
  root.style.setProperty("--surface-strong", theme.card)
  root.style.setProperty("--text", theme.text)
  root.style.setProperty("--muted", theme.muted || DEFAULT_THEME.muted)
  root.style.setProperty("--primary", theme.primary || DEFAULT_THEME.primary)
  root.style.setProperty("--primary-hover", theme.primary || DEFAULT_THEME.primary)
  root.style.setProperty("--secondary", "#E7EDF4")
  root.style.setProperty("--secondary-hover", "#D9E3EE")
  root.style.setProperty("--surface-radius", `${theme.radius || DEFAULT_THEME.radius}px`)
}



export function getStoredAccessibilityMode()
{
  return localStorage.getItem(ACCESSIBILITY_MODE_KEY) || DEFAULT_ACCESSIBILITY_MODE
}



export function applyAccessibilityMode(mode)
{
  const root = document.documentElement

  root.classList.remove(...ACCESSIBILITY_CLASS_NAMES)

  if (mode === "dark")
  {
    root.classList.add("accessibility-dark")
  }

  if (mode === "high_contrast")
  {
    root.classList.add("accessibility-high-contrast")
  }

  if (mode === "dyslexia")
  {
    root.classList.add("accessibility-dyslexia")
  }

  Object.entries(ACCESSIBILITY_MODE_VARIABLES[mode] || {}).forEach(([property, value]) =>
  {
    root.style.setProperty(property, value)
  })
}



export function saveAccessibilityMode(mode)
{
  localStorage.setItem(ACCESSIBILITY_MODE_KEY, mode)
  applyTheme(getStoredTheme())
  applyAccessibilityMode(mode)
}



export function saveTheme(theme)
{
  localStorage.setItem(SITE_THEME_KEY, JSON.stringify(theme))
  applyTheme(theme)
  applyAccessibilityMode(getStoredAccessibilityMode())
}



export function resetTheme()
{
  localStorage.setItem(SITE_THEME_KEY, JSON.stringify(DEFAULT_THEME))
  localStorage.setItem(ACCESSIBILITY_MODE_KEY, DEFAULT_ACCESSIBILITY_MODE)
  applyTheme(DEFAULT_THEME)
  applyAccessibilityMode(DEFAULT_ACCESSIBILITY_MODE)
}
