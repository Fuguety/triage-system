import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../styles/admin.css"
import { getAdminQueue, updateQueueStatus } from "../services/adminService"
import { clearAuth as clearStoredAuth, getStoredHospital, getStoredToken, loginDebugHospital, loginHospital, registerHospital, storeAuth as storeStoredAuth } from "../services/authService"
import { getPriorityMeta } from "../utils/priority"

const STATUS_TABS = ["waiting", "assessing", "completed", "rejected"]
const PRIORITY_ORDER =
{
  RESUSCITATION: 1,
  EMERGENT: 2,
  URGENT: 3,
  LESS_URGENT: 4,
  NON_URGENT: 5
}



function getPriorityRank(priority)
{
  return PRIORITY_ORDER[priority] || PRIORITY_ORDER.NON_URGENT
}



function sortQueueByPriority(patients, sortDirection)
{
  return [...patients].sort((firstPatient, secondPatient) =>
  {
    const firstPriorityRank = getPriorityRank(firstPatient.priority)
    const secondPriorityRank = getPriorityRank(secondPatient.priority)
    const priorityDifference = sortDirection === "low"
      ? secondPriorityRank - firstPriorityRank
      : firstPriorityRank - secondPriorityRank

    if (priorityDifference !== 0)
    {
      return priorityDifference
    }

    return (firstPatient.queuePosition || 0) - (secondPatient.queuePosition || 0)
  })
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
  const [expandedCards, setExpandedCards] = useState({})
  const [completeTarget, setCompleteTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [prioritySortDirection, setPrioritySortDirection] = useState("high")

  function storeAuth(authToken, authHospital)
  {
    storeStoredAuth(authToken, authHospital)
    setToken(authToken)
    setHospital(authHospital)
  }



  function clearAuth()
  {
    clearStoredAuth()
    setToken("")
    setHospital(null)
    setQueue([])
  }



  const loadQueue = useCallback(async (activeToken = token) =>
  {
    try
    {
      setLoading(true)
      setError("")

      const data = await getAdminQueue(activeToken)

      setQueue(data.patients)
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

      const data = mode === "register"
        ? await registerHospital(name, email, password)
        : await loginHospital(email, password)

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

      const data = await loginDebugHospital()

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



  function togglePatientDetails(sessionId)
  {
    setExpandedCards(currentState =>
    {
      return {
        ...currentState,
        [sessionId]: !currentState[sessionId]
      }
    })
  }



  async function handleQueueAction(sessionId, action)
  {
    try
    {
      setError("")

      await updateQueueStatus(token, sessionId, action)

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
      setCompleteTarget(null)
      setDeleteTarget(null)
    }
  }



  const filteredQueue = useMemo(() =>
  {
    return queue.filter(patient => patient.status === activeTab)
  }, [activeTab, queue])



  const sortedQueue = useMemo(() =>
  {
    return sortQueueByPriority(filteredQueue, prioritySortDirection)
  }, [filteredQueue, prioritySortDirection])



  function renderAuthTabs()
  {
    return (
      <div className="admin-tabs" role="tablist">
        <button aria-label="Open login tab" className={mode === "login" ? "" : "secondary-button"} onClick={() => setMode("login")} type="button">
          Login
        </button>
        <button aria-label="Open register tab" className={mode === "register" ? "" : "secondary-button"} onClick={() => setMode("register")} type="button">
          Register
        </button>
      </div>
    )
  }



  function renderDebugLogin()
  {
    return (
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
    )
  }



  function renderAuthForm()
  {
    return (
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
    )
  }



  function renderAuthPanel()
  {
    if (token)
    {
      return null
    }

    return (
      <div className="container assessment-panel intake-panel auth-panel">
        {renderAuthTabs()}
        {renderDebugLogin()}
        {renderAuthForm()}
      </div>
    )
  }



  function renderDashboardHeader()
  {
    return (
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
    )
  }



  function renderStatusTabs()
  {
    return (
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
    )
  }



  function renderQueueSortControls()
  {
    return (
      <div className="queue-sort-controls" aria-label="Queue sort controls">
        <span className="question-label">Sort queue</span>

        <div className="admin-tabs queue-sort-buttons">
          <button
            aria-pressed={prioritySortDirection === "high"}
            className={prioritySortDirection === "high" ? "" : "secondary-button"}
            onClick={() => setPrioritySortDirection("high")}
            type="button"
          >
            High priority first
          </button>
          <button
            aria-pressed={prioritySortDirection === "low"}
            className={prioritySortDirection === "low" ? "" : "secondary-button"}
            onClick={() => setPrioritySortDirection("low")}
            type="button"
          >
            Low priority first
          </button>
        </div>
      </div>
    )
  }



  function renderAiSupportSummary(patient)
  {
    const aiSupportSummary = patient.aiSupportSummary

    if (!aiSupportSummary)
    {
      return null
    }

    const riskFactors = aiSupportSummary.riskFactors || []

    return (
      <section className="patient-context ai-support-summary patient-clinical-summary" aria-label="AI Support Summary">
        <div>
          <p className="question-label">AI Support Summary</p>
          <p className="ai-support-warning">This AI summary is decision support only and does not replace clinical judgment.</p>
        </div>

        <div className="ai-support-grid">
          <div className="ai-support-item">
            <span>Brief</span>
            <strong>{aiSupportSummary.brief || "Not available"}</strong>
          </div>

          <div className="ai-support-item">
            <span>Suggested Priority</span>
            <strong>{aiSupportSummary.suggestedPriority || "Not available"}</strong>
          </div>

          <div className="ai-support-item">
            <span>Reason</span>
            <strong>{aiSupportSummary.reason || "Not available"}</strong>
          </div>

          <div className="ai-support-item">
            <span>Risk Factors</span>
            <strong>{riskFactors.length ? riskFactors.join(", ") : "None identified"}</strong>
          </div>
        </div>
      </section>
    )
  }



  function renderPatientDetails(patient)
  {
    const contextItems = [
      { label: "Gender", value: patient.gender },
      { label: "Age", value: patient.age },
      { label: "Pregnancy status", value: patient.pregnancyStatus },
      { label: "Pregnancy duration", value: patient.pregnancyDetails },
      { label: "Last period", value: patient.lastPeriod },
      { label: "Allergies", value: patient.allergies || "Not provided" },
      { label: "Medical conditions", value: patient.medicalConditions || "Not provided" }
    ].filter(item => item.value)

    return (
      <div className="admin-card-details">
        <section className="patient-context patient-clinical-summary" aria-label="Patient context">
          <p className="question-label">Patient context</p>

          <div className="patient-context-grid">
            {contextItems.map(item => (
              <div className="patient-context-badge" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        {renderAiSupportSummary(patient)}

        <div className="admin-actions compact-actions">
          <button className="secondary-button" onClick={() => navigate(`/admin/queue/${patient.sessionId}`)} type="button">
            Check Patient Details
          </button>

          {patient.status === "waiting" && (
            <button className="secondary-button" onClick={() => handleQueueAction(patient.sessionId, "assess")} type="button">
              Start Assessing
            </button>
          )}

          {patient.status === "assessing" && (
            <button className="secondary-button" onClick={() => navigate(`/admin/queue/${patient.sessionId}`)} type="button">
              Open Case
            </button>
          )}

          {patient.status !== "completed" && (
            <button className="danger-button" onClick={() => setDeleteTarget(patient)} type="button">
              Reject
            </button>
          )}
        </div>
      </div>
    )
  }



  function renderQueueCard(patient)
  {
    const priorityMeta = getPriorityMeta(patient.priority)
    const expanded = Boolean(expandedCards[patient.sessionId])
    const patientDisplayName = patient.fullName || "Anonymous"

    return (
      <div className={`queue-card admin-card admin-queue-card ${priorityMeta.colorClass}`} key={patient.sessionId}>
        <div className="admin-card-summary">
          <div className="admin-card-main">
            <p className="question-label">
              {patient.queuePosition ? `Position ${patient.queuePosition}` : "Resolved"}
            </p>
            <h3>{patientDisplayName}</h3>

            <div className="queue-summary-grid">
              <span>Patient #{patient.patientNumber}</span>
              <span>Gender: {patient.gender || "Not recorded"}</span>
              <span>Age: {patient.age || "Not recorded"}</span>
              <span>{priorityMeta.icon} {priorityMeta.level} - {priorityMeta.label}</span>
              <span className="status-tag">{patient.status}</span>
            </div>
          </div>

          <button
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} details for patient ${patient.patientNumber}`}
            className="secondary-button expand-button"
            onClick={() => togglePatientDetails(patient.sessionId)}
            type="button"
          >
            {expanded ? "Hide details \u2191" : "Show details \u2193"}
          </button>
        </div>

        {expanded && renderPatientDetails(patient)}
      </div>
    )
  }



  function renderQueueList()
  {
    if (loading)
    {
      return <p>Loading queue...</p>
    }

    if (sortedQueue.length === 0)
    {
      return <p>No patients in {activeTab}.</p>
    }

    return (
      <div className="queue-list">
        {sortedQueue.map(renderQueueCard)}
      </div>
    )
  }



  function renderAdminBoard()
  {
    if (!token)
    {
      return null
    }

    return (
      <div className="container assessment-panel admin-board admin-container">
        {renderDashboardHeader()}
        {renderStatusTabs()}
        {renderQueueSortControls()}
        {renderQueueList()}
      </div>
    )
  }



  function renderCompleteModal()
  {
    if (!completeTarget)
    {
      return null
    }

    return (
      <div aria-modal="true" className="modal-backdrop" role="dialog">
        <div className="modal-card">
          <p className="question-label">Confirm completion</p>
          <h3>Are you sure you want to mark this patient as complete?</h3>

          <div className="admin-actions">
            <button className="secondary-button" onClick={() => setCompleteTarget(null)} type="button">
              Cancel
            </button>
            <button className="success-button" onClick={() => handleQueueAction(completeTarget.sessionId, "complete")} type="button">
              Confirm Complete
            </button>
          </div>
        </div>
      </div>
    )
  }



  function renderRejectModal()
  {
    if (!deleteTarget)
    {
      return null
    }

    return (
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
    )
  }



  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/">{"\u2190 Back"}</Link>

        <div>
          <p className="eyebrow">Hospital staff</p>
          <h2>Hospital Admin Panel</h2>
        </div>
      </div>

      {error && <p className="status error">{error}</p>}

      {renderAuthPanel()}
      {renderAdminBoard()}
      {renderCompleteModal()}
      {renderRejectModal()}
    </div>
  )
}

export default Admin
