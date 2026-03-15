import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../styles/home.css"
import { SITE_PROFILE_KEY } from "../utils/theme"



function getStoredSiteProfile()
{
  const value = localStorage.getItem(SITE_PROFILE_KEY)

  return value ? JSON.parse(value) : null
}



function Home()
{
  const navigate = useNavigate()
  const [siteProfile, setSiteProfile] = useState(getStoredSiteProfile())
  const [hospitalName, setHospitalName] = useState(siteProfile?.hospitalName || "")
  const [hospitalUnit, setHospitalUnit] = useState(siteProfile?.hospitalUnit || "")
  const [hospitalAddress, setHospitalAddress] = useState(siteProfile?.hospitalAddress || "")
  const [hospitalPhone, setHospitalPhone] = useState(siteProfile?.hospitalPhone || "")

  function applyDebugSetup()
  {
    const nextProfile =
    {
      hospitalAddress: "123 Demo Avenue, Paris",
      hospitalName: "Debug General Hospital",
      hospitalPhone: "+33 01 23 45 67 89",
      hospitalUnit: "Emergency Department"
    }

    localStorage.setItem(SITE_PROFILE_KEY, JSON.stringify(nextProfile))
    setHospitalName(nextProfile.hospitalName)
    setHospitalUnit(nextProfile.hospitalUnit)
    setHospitalAddress(nextProfile.hospitalAddress)
    setHospitalPhone(nextProfile.hospitalPhone)
    setSiteProfile(nextProfile)
  }

  function saveSetup(event)
  {
    event.preventDefault()

    const nextProfile =
    {
      hospitalAddress: hospitalAddress.trim(),
      hospitalName: hospitalName.trim(),
      hospitalPhone: hospitalPhone.trim(),
      hospitalUnit: hospitalUnit.trim()
    }

    localStorage.setItem(SITE_PROFILE_KEY, JSON.stringify(nextProfile))
    setSiteProfile(nextProfile)
  }



  function resetSetup()
  {
    localStorage.removeItem(SITE_PROFILE_KEY)
    setSiteProfile(null)
    setHospitalName("")
    setHospitalUnit("")
    setHospitalAddress("")
    setHospitalPhone("")
  }

  if (!siteProfile)
  {
    return (
      <div className="shell">
        <section className="page-header">
          <div>
            <p className="eyebrow">Hospital setup</p>
            <h2>Configure this triage station</h2>
          </div>
        </section>

        <div className="container setup-card">
          <div className="setup-topbar">
            <p className="question-label">Local kiosk configuration</p>
            <Link
              aria-label="Open staff login"
              className="staff-access-soft"
              to="/admin"
            >
              Staff Login
            </Link>
          </div>

          <div className="setup-grid">
            <div>
              <p className="question-label">First-time setup</p>
              <h3>Register the hospital details for this screen</h3>
              <p className="section-copy">
                This screen is for local hospital setup. After saving, patients will only see the triage home screen.
              </p>
            </div>

            <form className="form-grid setup-form" onSubmit={saveSetup}>
              <label className="form-field">
                <span>Hospital name</span>
                <input
                  aria-label="Hospital name"
                  onChange={event => setHospitalName(event.target.value)}
                  required
                  type="text"
                  value={hospitalName}
                />
              </label>

              <label className="form-field">
                <span>Unit or department</span>
                <input
                  aria-label="Unit or department"
                  onChange={event => setHospitalUnit(event.target.value)}
                  placeholder="Emergency, urgent care, reception..."
                  type="text"
                  value={hospitalUnit}
                />
              </label>

              <label className="form-field">
                <span>Address</span>
                <input
                  aria-label="Hospital address"
                  onChange={event => setHospitalAddress(event.target.value)}
                  type="text"
                  value={hospitalAddress}
                />
              </label>

              <label className="form-field">
                <span>Phone</span>
                <input
                  aria-label="Hospital phone"
                  onChange={event => setHospitalPhone(event.target.value)}
                  type="text"
                  value={hospitalPhone}
                />
              </label>

              <div className="setup-actions">
                <button aria-label="Use debug hospital setup" className="secondary-button" onClick={applyDebugSetup} type="button">
                  Use Debug Setup
                </button>
                <button aria-label="Save hospital setup and continue" type="submit">
                  Save And Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <section className="hero-card kiosk-hero">
        <div className="hero-copy">
          <p className="eyebrow">{siteProfile.hospitalUnit || "Triage station"}</p>
          <h1>{siteProfile.hospitalName}</h1>
          <p className="hero-text">
            Start a new triage questionnaire or check the queue position.
          </p>

          <div className="hero-actions">
            <button aria-label="Start triage questionnaire" onClick={() => navigate("/assessment")}>
              Start Triage Questionnaire
            </button>
            <button aria-label="Check queue position" className="secondary-button" onClick={() => navigate("/queue")}>
              Check Queue Position
            </button>
          </div>
        </div>

        <div className="hero-panel">
          <div className="metric-card">
            <span className="metric-label">Address</span>
            <strong>{siteProfile.hospitalAddress || "Not provided"}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Phone</span>
            <strong>{siteProfile.hospitalPhone || "Not provided"}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Station status</span>
            <strong>Ready for intake</strong>
          </div>
        </div>
      </section>

      <section className="quick-links">
        <button aria-label="Edit hospital setup" className="secondary-button" onClick={resetSetup} type="button">
          Edit Hospital Setup
        </button>
        <button aria-label="Open visual settings" className="secondary-button" onClick={() => navigate("/settings")} type="button">
          Visual Settings
        </button>
      </section>

      <section className="staff-access">
        <Link aria-label="Open staff login" className="staff-access-link" to="/admin">Staff access</Link>
      </section>
    </div>
  )
}

export default Home
