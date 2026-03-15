import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../styles/admin.css"
import { getPriorityMeta } from "../utils/priority"

const TOKEN_KEY = "triage-admin-token"
const HOSPITAL_KEY = "triage-admin-hospital"
const STATUS_TABS = ["waiting", "assessing", "completed", "rejected"]



function getStoredToken()
{
  return localStorage.getItem(TOKEN_KEY) || ""
}



function getStoredHospital()
{
  const value = localStorage.getItem(HOSPITAL_KEY)

  return value ? JSON.parse(value) : null
}



function Admin()
{
  const navigate = useNavigate()
  const [mode, setMode] = useState("login")
  const [activeTab, setActiveTab] = useState("waiting")
  const [token, setToken] = useState(getStoredToken())
  const [hospital, setHospital] = useState(getStoredHospital())
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [queue, setQueue] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState("")
  const [formState, setFormState] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  function storeAuth(authToken, authHospital)
  {
    localStorage.setItem(TOKEN_KEY, authToken)
    localStorage.setItem(HOSPITAL_KEY, JSON.stringify(authHospital))
    setToken(authToken)
    setHospital(authHospital)
  }



  function clearAuth()
  {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(HOSPITAL_KEY)
    setToken("")
    setHospital(null)
    setQueue([])
  }



  function syncFormState(patients)
  {
    const nextState = {}

    patients.forEach(patient =>
    {
      nextState[patient.sessionId] =
      {
        aboutDetails: patient.aboutDetails || "",
        healthInsurance: patient.healthInsurance || "",
        patientId: patient.patientId || ""
      }
    })

    setFormState(nextState)
  }



  const loadQueue = useCallback(async (activeToken = token) =>
  {
    try
    {
      setLoading(true)
      setError("")

      const response = await fetch("/admin/queue",
      {
        headers:
        {
          Authorization: `Bearer ${activeToken}`
        }
      })

      const data = await response.json()

      if (!response.ok)
      {
        throw new Error(data.error || "Failed to load admin queue")
      }

      setQueue(data.patients)
      syncFormState(data.patients)
    }
    catch (requestError)
    {
      setError(requestError.message)
    }
    finally
    {
      setLoading(false)
    }
  }, [token])



  useEffect(() =>
  {
    if (token)
    {
      loadQueue(token)
    }
  }, [loadQueue, token])



  async function handleAuthSubmit(event)
  {
    event.preventDefault()

    try
    {
      setLoading(true)
      setError("")

      const endpoint = mode === "register" ? "/auth/register" : "/auth/login"
      const response = await fetch(endpoint,
      {
        method: "POST",
        headers:
        {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
        {
          name,
          email,
          password
        })
      })

      const data = await response.json()

      if (!response.ok)
      {
        throw new Error(data.error || "Authentication failed")
      }

      storeAuth(data.token, data.hospital)
      setPassword("")
    }
    catch (requestError)
    {
      setError(requestError.message)
    }
    finally
    {
      setLoading(false)
    }
  }



  async function useDebugLogin()
  {
    setMode("login")
    setEmail("debug@triage.local")
    setPassword("debug123")

    try
    {
      setLoading(true)
      setError("")

      const response = await fetch("/auth/login",
      {
        method: "POST",
        headers:
        {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
        {
          email: "debug@triage.local",
          password: "debug123"
        })
      })

      const data = await response.json()

      if (!response.ok)
      {
        throw new Error(data.error || "Debug login failed")
      }

      storeAuth(data.token, data.hospital)
    }
    catch (requestError)
    {
      setError(requestError.message)
    }
    finally
    {
      setLoading(false)
    }
  }



  function handleFieldChange(sessionId, field, value)
  {
    setFormState(currentState =>
    {
      return {
        ...currentState,
        [sessionId]:
        {
          ...currentState[sessionId],
          [field]: value
        }
      }
    })
  }



  async function savePatient(sessionId)
  {
    try
    {
      setSavingId(sessionId)
      setError("")

      const response = await fetch(`/admin/queue/${sessionId}`,
      {
        method: "PATCH",
        headers:
        {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formState[sessionId] || {})
      })

      const data = await response.json()

      if (!response.ok)
      {
        throw new Error(data.error || "Failed to update patient")
      }

      await loadQueue(token)
    }
    catch (requestError)
    {
      setError(requestError.message)
    }
    finally
    {
      setSavingId("")
    }
  }



  async function handleQueueAction(sessionId, action)
  {
    try
    {
      setSavingId(sessionId)
      setError("")

      const response = await fetch(`/admin/queue/${sessionId}/${action}`,
      {
        method: "POST",
        headers:
        {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok)
      {
        throw new Error(data.error || "Failed to update queue")
      }

      await loadQueue(token)

      if (action === "assess")
      {
        navigate(`/admin/queue/${sessionId}`)
      }
    }
    catch (requestError)
    {
      setError(requestError.message)
    }
    finally
    {
      setSavingId("")
      setDeleteTarget(null)
    }
  }



  const filteredQueue = useMemo(() =>
  {
    return queue.filter(patient => patient.status === activeTab)
  }, [activeTab, queue])

  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/">Back</Link>
        <div>
          <p className="eyebrow">Hospital staff</p>
          <h2>Hospital Admin Panel</h2>
        </div>
      </div>

      {error && <p className="status error">{error}</p>}

      {!token && (
        <div className="container assessment-panel intake-panel auth-panel">
          <div className="admin-tabs" role="tablist">
            <button aria-label="Open login tab" className={mode === "login" ? "" : "secondary-button"} onClick={() => setMode("login")} type="button">
              Login
            </button>
            <button aria-label="Open register tab" className={mode === "register" ? "" : "secondary-button"} onClick={() => setMode("register")} type="button">
              Register
            </button>
          </div>

          <div className="debug-box">
            <p className="question-label">Debug hospital</p>
            <p>Email: <strong>debug@triage.local</strong></p>
            <p>Password: <strong>debug123</strong></p>
            <p>Role: <strong>admin</strong></p>
            <div className="hero-actions">
              <button aria-label="Use debug hospital login" className="secondary-button" onClick={useDebugLogin} type="button">
                Use Debug Login
              </button>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleAuthSubmit}>
            {mode === "register" && (
              <label className="form-field">
                <span>Hospital name</span>
                <input aria-label="Hospital name" onChange={event => setName(event.target.value)} type="text" value={name} />
              </label>
            )}

            <label className="form-field">
              <span>Email</span>
              <input aria-label="Hospital email" onChange={event => setEmail(event.target.value)} type="email" value={email} />
            </label>

            <label className="form-field">
              <span>Password</span>
              <input aria-label="Hospital password" onChange={event => setPassword(event.target.value)} type="password" value={password} />
            </label>

            <button aria-label={mode === "register" ? "Register hospital" : "Login hospital"} disabled={loading} type="submit">
              {loading ? "Please wait..." : mode === "register" ? "Register Hospital" : "Login"}
            </button>
          </form>
        </div>
      )}

      {token && (
        <div className="container assessment-panel admin-board admin-container">
          <div className="admin-header">
            <div>
              <p className="question-label">Signed in</p>
              <h3>{hospital?.name}</h3>
              <p className="queue-session">Role: {hospital?.role}</p>
            </div>

            <div className="admin-actions">
              <Link className="text-button" to="/admin/audit">Open Audit Log</Link>
              <Link className="text-button" to="/settings">Settings</Link>
              <button className="secondary-button" onClick={() => loadQueue(token)} type="button">
                Refresh
              </button>
              <button className="secondary-button" onClick={clearAuth} type="button">
                Logout
              </button>
            </div>
          </div>

          <div className="admin-tabs" role="tablist">
            {STATUS_TABS.map(status => (
              <button
                aria-label={`Open ${status} patients tab`}
                className={activeTab === status ? "" : "secondary-button"}
                key={status}
                onClick={() => setActiveTab(status)}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>

          {loading && <p>Loading queue...</p>}
          {!loading && filteredQueue.length === 0 && <p>No patients in {activeTab}.</p>}

          {!loading && filteredQueue.length > 0 && (
            <div className="queue-list">
              {filteredQueue.map(patient =>
              {
                const priorityMeta = getPriorityMeta(patient.priority)

                return (
                  <div className={`queue-card admin-card ${priorityMeta.colorClass}`} key={patient.sessionId}>
                    <div className="admin-card-top">
                      <div>
                        <p className="question-label">
                          {patient.queuePosition ? `Position ${patient.queuePosition}` : "Resolved"}
                        </p>
                        <h3>{priorityMeta.icon} {priorityMeta.level} - {priorityMeta.label}</h3>
                        <p className="queue-session">Color reference: {priorityMeta.hex}</p>
                        <p className="queue-session">Patient number: #{patient.patientNumber}</p>
                      </div>

                      <div className="status-stack">
                        <div className="status-badge">{patient.anonymous ? "Anonymous" : "Identified"}</div>
                        <div className="status-badge status-tag">{patient.status}</div>
                      </div>
                    </div>

                    <div className="form-grid">
                      <label className="form-field">
                        <span>Patient ID</span>
                        <input
                          aria-label={`Patient ID for patient ${patient.patientNumber}`}
                          onChange={event => handleFieldChange(patient.sessionId, "patientId", event.target.value)}
                          type="text"
                          value={formState[patient.sessionId]?.patientId || ""}
                        />
                      </label>

                      <label className="form-field">
                        <span>Health insurance</span>
                        <input
                          aria-label={`Health insurance for patient ${patient.patientNumber}`}
                          onChange={event => handleFieldChange(patient.sessionId, "healthInsurance", event.target.value)}
                          type="text"
                          value={formState[patient.sessionId]?.healthInsurance || ""}
                        />
                      </label>

                      <label className="form-field">
                        <span>About / Details</span>
                        <textarea
                          aria-label={`About details for patient ${patient.patientNumber}`}
                          className="sitrep-input"
                          onChange={event => handleFieldChange(patient.sessionId, "aboutDetails", event.target.value)}
                          value={formState[patient.sessionId]?.aboutDetails || ""}
                        />
                      </label>
                    </div>

                    <div className="admin-actions">
                      <button disabled={savingId === patient.sessionId} onClick={() => savePatient(patient.sessionId)} type="button">
                        Save Changes
                      </button>

                      {patient.status === "waiting" && (
                        <button className="secondary-button" disabled={savingId === patient.sessionId} onClick={() => handleQueueAction(patient.sessionId, "assess")} type="button">
                          Start Assessing
                        </button>
                      )}

                      {patient.status === "assessing" && (
                        <>
                          <button className="secondary-button" onClick={() => navigate(`/admin/queue/${patient.sessionId}`)} type="button">
                            Open Case
                          </button>
                          <button className="success-button" disabled={savingId === patient.sessionId} onClick={() => handleQueueAction(patient.sessionId, "complete")} type="button">
                            Completed
                          </button>
                        </>
                      )}

                      {patient.status !== "completed" && (
                        <button className="danger-button" disabled={savingId === patient.sessionId} onClick={() => setDeleteTarget(patient)} type="button">
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {deleteTarget && (
        <div aria-modal="true" className="modal-backdrop" role="dialog">
          <div className="modal-card">
            <p className="question-label">Confirm rejection</p>
            <h3>Reject patient #{deleteTarget.patientNumber}?</h3>
            <p className="modal-copy">
              This will move the patient to rejected status and remove them from the active assessment flow.
            </p>
            <div className="admin-actions">
              <button className="secondary-button" onClick={() => setDeleteTarget(null)} type="button">
                Cancel
              </button>
              <button className="danger-button" onClick={() => handleQueueAction(deleteTarget.sessionId, "reject")} type="button">
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
