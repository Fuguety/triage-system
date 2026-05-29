import { useState } from "react"
import { Link } from "react-router-dom"
import "../styles/settings.css"
import { getStoredToken } from "../services/authService"
import { DEFAULT_ACCESSIBILITY_MODE, DEFAULT_THEME, getStoredAccessibilityMode, getStoredTheme, resetTheme, saveAccessibilityMode, saveTheme } from "../utils/theme"



function Settings()
{
  const [theme, setTheme] = useState(getStoredTheme())
  const [accessibilityMode, setAccessibilityMode] = useState(getStoredAccessibilityMode())
  const token = getStoredToken()

  function handleChange(field, value)
  {
    setTheme(currentTheme =>
    {
      return {
        ...currentTheme,
        [field]: value
      }
    })
  }



  function handleSave(event)
  {
    event.preventDefault()
    saveAccessibilityMode(accessibilityMode)

    if (token)
    {
      saveTheme(theme)
    }
  }



  function handleReset()
  {
    if (token)
    {
      resetTheme()
      setTheme(DEFAULT_THEME)
    }
    else
    {
      saveAccessibilityMode(DEFAULT_ACCESSIBILITY_MODE)
    }

    setAccessibilityMode(DEFAULT_ACCESSIBILITY_MODE)
  }



  const previewStyle =
  {
    background: theme.card,
    borderRadius: `${theme.radius}px`,
    color: theme.text
  }

  const badgeStyle =
  {
    background: theme.primary
  }

  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/">{"\u2190 Back"}</Link>
        <div>
          <p className="eyebrow">{token ? "Hospital preferences" : "Display preferences"}</p>
          <h2>{token ? "Settings" : "Visual Accessibility Settings"}</h2>
        </div>
      </div>

      <div className="container settings-card">
        <p className="section-copy settings-copy">
          {token
            ? "Adjust display preferences and staff-managed visual settings for this hospital screen."
            : "Choose a display mode for this device. These settings do not change hospital or staff configuration."}
        </p>

        <form className="form-grid settings-form" onSubmit={handleSave}>
          <fieldset className="settings-field-wide settings-mode-field">
            <legend>Accessibility display mode</legend>

            <div className="settings-mode-options">
              <label>
                <input checked={accessibilityMode === "default"} name="accessibilityMode" onChange={() => setAccessibilityMode("default")} type="radio" />
                <span>Default</span>
              </label>

              <label>
                <input checked={accessibilityMode === "dark"} name="accessibilityMode" onChange={() => setAccessibilityMode("dark")} type="radio" />
                <span>Dark Mode</span>
              </label>

              <label>
                <input checked={accessibilityMode === "high_contrast"} name="accessibilityMode" onChange={() => setAccessibilityMode("high_contrast")} type="radio" />
                <span>High Contrast Mode</span>
              </label>

              <label>
                <input checked={accessibilityMode === "dyslexia"} name="accessibilityMode" onChange={() => setAccessibilityMode("dyslexia")} type="radio" />
                <span>Dyslexia-Friendly Mode</span>
              </label>
            </div>
          </fieldset>

          {!token && (
            <div className="settings-field-wide settings-staff-note">
              <p className="section-copy">
                Hospital-wide visual configuration is restricted to staff. Display mode is saved only on this device.
              </p>
              <Link className="text-button" to="/admin">Staff Access</Link>
            </div>
          )}

          {token && (
            <>
              <label className="form-field">
                <span>Background color</span>
                <div className="settings-swatch-row">
                  <div className="settings-swatch">
                    <input aria-label="Background color" onChange={event => handleChange("background", event.target.value)} type="color" value={theme.background} />
                  </div>
                  <input aria-label="Background color hex value" className="settings-input" onChange={event => handleChange("background", event.target.value)} type="text" value={theme.background} />
                </div>
              </label>

              <label className="form-field">
                <span>Card color</span>
                <div className="settings-swatch-row">
                  <div className="settings-swatch">
                    <input aria-label="Card color" onChange={event => handleChange("card", event.target.value)} type="color" value={theme.card} />
                  </div>
                  <input aria-label="Card color hex value" className="settings-input" onChange={event => handleChange("card", event.target.value)} type="text" value={theme.card} />
                </div>
              </label>

              <label className="form-field">
                <span>Text color</span>
                <div className="settings-swatch-row">
                  <div className="settings-swatch">
                    <input aria-label="Text color" onChange={event => handleChange("text", event.target.value)} type="color" value={theme.text} />
                  </div>
                  <input aria-label="Text color hex value" className="settings-input" onChange={event => handleChange("text", event.target.value)} type="text" value={theme.text} />
                </div>
              </label>

              <label className="form-field">
                <span>Muted text color</span>
                <div className="settings-swatch-row">
                  <div className="settings-swatch">
                    <input aria-label="Muted text color" onChange={event => handleChange("muted", event.target.value)} type="color" value={theme.muted} />
                  </div>
                  <input aria-label="Muted text hex value" className="settings-input" onChange={event => handleChange("muted", event.target.value)} type="text" value={theme.muted} />
                </div>
              </label>

              <label className="form-field">
                <span>Primary button color</span>
                <div className="settings-swatch-row">
                  <div className="settings-swatch">
                    <input aria-label="Primary button color" onChange={event => handleChange("primary", event.target.value)} type="color" value={theme.primary} />
                  </div>
                  <input aria-label="Primary button hex value" className="settings-input" onChange={event => handleChange("primary", event.target.value)} type="text" value={theme.primary} />
                </div>
              </label>

              <label className="form-field settings-field-wide">
                <span>Card corner radius</span>
                <input aria-label="Card corner radius" max="36" min="12" onChange={event => handleChange("radius", Number(event.target.value))} type="range" value={theme.radius} />
                <span className="settings-note">{theme.radius}px</span>
              </label>

              <div className="settings-preview">
                <p className="question-label">Preview</p>
                <div className="settings-preview-card" style={previewStyle}>
                  <strong>Accessible sample</strong>
                  <span>Body text 16px, readable heading, neutral medical UI.</span>
                  <span className="settings-preview-badge" style={badgeStyle}>Primary action</span>
                  <p className="settings-note">Recommended default background: #F5F7FA</p>
                </div>
              </div>
            </>
          )}

          <div className="hero-actions settings-actions">
            <button aria-label="Save display settings" type="submit">Save Settings</button>
            <button aria-label="Reset display settings to default" className="secondary-button" onClick={handleReset} type="button">
              Default Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Settings
