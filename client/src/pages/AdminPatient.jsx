import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import "../styles/admin.css"
import { completeQueuePatient, getQueuePatient, rejectQueuePatient, startAssessingPatient, updateQueuePatient } from "../services/adminService"
import { getStoredToken } from "../services/authService"
import { getPriorityMeta } from "../utils/priority"

function AdminPatient()
{
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const token = getStoredToken()
  const [patient, setPatient] = useState(null)
  const [formState, setFormState] = useState(
  {
    aboutDetails: "",
    fullName: "",
    healthInsurance: "",
    patientId: ""
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const priorityMeta = useMemo(() =>
  {
    return patient ? getPriorityMeta(patient.priority) : null
  }, [patient])



  const loadPatient = useCallback(async () =>
  {
    try
    {
      setLoading(true)
      setError("")

      const data = await getQueuePatient(token, sessionId)

      setPatient(data)
      setFormState(
      {
        aboutDetails: data.aboutDetails || "",
        fullName: data.fullName || "",
        healthInsurance: data.healthInsurance || "",
        patientId: data.patientId || ""
      })
    }
    catch (requestError)
    {
      setError(requestError.message)
    }
    finally
    {
      setLoading(false)
    }
  }, [sessionId, token])



  useEffect(() =>
  {
    if (token)
    {
      loadPatient()
    }
  }, [loadPatient, token])



  function handleFieldChange(field, value)
  {
    setFormState(currentState =>
    {
      return {
        ...currentState,
        [field]: value
      }
    })
  }



  async function savePatient()
  {
    try
    {
      setLoading(true)
      setError("")

      const data = await updateQueuePatient(token, sessionId, formState)

      setPatient(data)
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



  async function handleAction(action)
  {
    try
    {
      setLoading(true)
      setError("")

      if (action === "assess")
      {
        await startAssessingPatient(token, sessionId)
      }
      else if (action === "complete")
      {
        await completeQueuePatient(token, sessionId)
      }
      else
      {
        await rejectQueuePatient(token, sessionId)
      }

      navigate("/admin")
    }
    catch (requestError)
    {
      setError(requestError.message)
      setLoading(false)
    }
  }

  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/admin">Back To Queue</Link>
        <div>
          <p className="eyebrow">Doctor workspace</p>
          <h2>Assessment Workspace</h2>
        </div>
      </div>

      {error && <p className="status error">{error}</p>}
      {!token && <p className="status error">Login to open this case.</p>}
      {loading && !patient && <p>Loading patient...</p>}

      {patient && priorityMeta && (
        <div className={`container assessment-panel admin-card doctor-card ${priorityMeta.colorClass}`}>
          <div className="admin-card-top">
            <div>
              <p className="question-label">{priorityMeta.level}</p>
              <h3>{priorityMeta.icon} {priorityMeta.level} - {priorityMeta.label}</h3>
              <p className="queue-session">Color reference: {priorityMeta.hex}</p>
              <p className="queue-session">Full name: {patient.fullName || "Not provided"}</p>
              <p className="queue-session">Patient number: #{patient.patientNumber}</p>
              <p className="queue-session">Status: {patient.status}</p>
            </div>

            <div className="status-stack">
              <div className="status-badge">{patient.anonymous ? "Anonymous" : "Identified"}</div>
              <div className="status-badge status-tag">{patient.status}</div>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Full Name</span>
              <input aria-label="Full Name" onChange={event => handleFieldChange("fullName", event.target.value)} type="text" value={formState.fullName} />
            </label>

            <label className="form-field">
              <span>Patient ID</span>
              <input aria-label="Patient ID" onChange={event => handleFieldChange("patientId", event.target.value)} type="text" value={formState.patientId} />
            </label>

            <label className="form-field">
              <span>Health insurance</span>
              <input aria-label="Health insurance" onChange={event => handleFieldChange("healthInsurance", event.target.value)} type="text" value={formState.healthInsurance} />
            </label>

            <label className="form-field">
              <span>About / Details</span>
              <textarea aria-label="About and details" className="sitrep-input" onChange={event => handleFieldChange("aboutDetails", event.target.value)} value={formState.aboutDetails} />
            </label>
          </div>

          <div className="admin-actions">
            <button disabled={loading} onClick={savePatient} type="button">
              Save Changes
            </button>
            <Link className="text-button" to="/admin/audit">Audit Log</Link>
            <Link className="text-button" to="/settings">Settings</Link>
            {patient.status === "waiting" && (
              <button className="secondary-button" disabled={loading} onClick={() => handleAction("assess")} type="button">
                Start Assessing
              </button>
            )}
            <button className="success-button" disabled={loading} onClick={() => handleAction("complete")} type="button">
              Completed
            </button>
            <button className="danger-button" disabled={loading} onClick={() => setShowRejectModal(true)} type="button">
              Reject
            </button>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div aria-modal="true" className="modal-backdrop" role="dialog">
          <div className="modal-card">
            <p className="question-label">Confirm rejection</p>
            <h3>Reject patient details?</h3>
            <p className="modal-copy">This will move the patient to rejected and close the case.</p>
            <div className="admin-actions">
              <button className="secondary-button" onClick={() => setShowRejectModal(false)} type="button">
                Cancel
              </button>
              <button className="danger-button" onClick={() => handleAction("reject")} type="button">
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPatient
