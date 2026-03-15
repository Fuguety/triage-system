export const SITE_PROFILE_KEY = "triage-site-profile"
export const SITE_THEME_KEY = "triage-site-theme"

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
  root.style.setProperty("--surface-strong", theme.card)
  root.style.setProperty("--text", theme.text)
  root.style.setProperty("--muted", theme.muted || DEFAULT_THEME.muted)
  root.style.setProperty("--primary", theme.primary || DEFAULT_THEME.primary)
  root.style.setProperty("--primary-hover", theme.primary || DEFAULT_THEME.primary)
  root.style.setProperty("--surface-radius", `${theme.radius || DEFAULT_THEME.radius}px`)
}



export function saveTheme(theme)
{
  localStorage.setItem(SITE_THEME_KEY, JSON.stringify(theme))
  applyTheme(theme)
}



export function resetTheme()
{
  localStorage.setItem(SITE_THEME_KEY, JSON.stringify(DEFAULT_THEME))
  applyTheme(DEFAULT_THEME)
}
