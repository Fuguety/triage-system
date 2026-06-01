import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import "../styles/admin.css"
import { completeQueuePatient, getQueuePatient, rejectQueuePatient, startAssessingPatient, updateQueuePatient } from "../services/adminService"
import { getStoredToken } from "../services/authService"
import { getPriorityMeta } from "../utils/priority"

const PRIORITY_OPTIONS = ["RESUSCITATION", "EMERGENT", "URGENT", "LESS_URGENT", "NON_URGENT"]



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
    patientId: "",
    priorityLevel: ""
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
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
        patientId: data.patientId || "",
        priorityLevel: data.priority || ""
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



  function renderPrioritySelect()
  {
    if (patient.status !== "assessing")
    {
      return null
    }

    return (
      <label className="form-field priority-card-field">
        <span>Adjust priority if needed</span>
        <select
          aria-label="Adjust priority if needed"
          className="priority-select"
          onChange={event => handleFieldChange("priorityLevel", event.target.value)}
          style=
          {{
            borderColor: getPriorityMeta(formState.priorityLevel).hex,
            color: getPriorityMeta(formState.priorityLevel).hex
          }}
          value={formState.priorityLevel}
        >
          {PRIORITY_OPTIONS.map(priority =>
          {
            const optionPriorityMeta = getPriorityMeta(priority)

            return (
              <option key={priority} style={{ color: optionPriorityMeta.hex }} value={priority}>
                {priority}
              </option>
            )
          })}
        </select>
      </label>
    )
  }



  function renderPatientHeader()
  {
    return (
      <div className="admin-card-top">
        <div>
          <p className="question-label">{priorityMeta.level}</p>
          <h3>{priorityMeta.icon} {priorityMeta.level} - {priorityMeta.label}</h3>
          <p className="queue-session">Full name: {patient.fullName || "Not provided"}</p>
          <p className="queue-session">Patient number: #{patient.patientNumber}</p>
          <p className="queue-session">Status: {patient.status}</p>
        </div>

        <div className="status-stack">
          <div className="status-badge">{patient.anonymous ? "Anonymous" : "Identified"}</div>
          <div className="status-badge status-tag">{patient.status}</div>
          {renderPrioritySelect()}
        </div>
      </div>
    )
  }



  function renderPatientContext()
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

    if (contextItems.length === 0)
    {
      return null
    }

    return (
      <section className="patient-context" aria-label="Patient context">
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
    )
  }



  function renderPatientForm()
  {
    return (
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

        <label className="form-field details-field">
          <span>About / Details</span>
          <textarea aria-label="About and details" className="sitrep-input" onChange={event => handleFieldChange("aboutDetails", event.target.value)} value={formState.aboutDetails} />
        </label>
      </div>
    )
  }



  function renderPatientActions()
  {
    return (
      <div className="admin-actions">
        <button disabled={loading} onClick={savePatient} type="button">
          Save Changes
        </button>

        {patient.status === "waiting" && (
          <button className="secondary-button" disabled={loading} onClick={() => handleAction("assess")} type="button">
            Start Assessing
          </button>
        )}

        <button className="success-button" disabled={loading} onClick={() => setShowCompleteModal(true)} type="button">
          Complete
        </button>
        <button className="danger-button" disabled={loading} onClick={() => setShowRejectModal(true)} type="button">
          Reject
        </button>
      </div>
    )
  }



  function renderPatientCard()
  {
    if (!patient || !priorityMeta)
    {
      return null
    }

    return (
      <div className={`container assessment-panel admin-card doctor-card ${priorityMeta.colorClass}`}>
        {renderPatientHeader()}
        {renderPatientContext()}
        {renderPatientForm()}
        {renderPatientActions()}
      </div>
    )
  }



  function renderCompleteModal()
  {
    if (!showCompleteModal)
    {
      return null
    }

    return (
      <div aria-modal="true" className="modal-backdrop" role="dialog">
        <div className="modal-card">
          <p className="question-label">Confirm completion</p>
          <h3>Are you sure you want to mark this patient as complete?</h3>

          <div className="admin-actions">
            <button className="secondary-button" onClick={() => setShowCompleteModal(false)} type="button">
              Cancel
            </button>
            <button className="success-button" onClick={() => handleAction("complete")} type="button">
              Confirm Complete
            </button>
          </div>
        </div>
      </div>
    )
  }



  function renderRejectModal()
  {
    if (!showRejectModal)
    {
      return null
    }

    return (
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
    )
  }



  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/admin">{"\u2190 Back"}</Link>

        <div>
          <p className="eyebrow">Doctor workspace</p>
          <h2>Assessment Workspace</h2>
        </div>
      </div>

      {error && <p className="status error">{error}</p>}
      {!token && <p className="status error">Login to open this case.</p>}
      {loading && !patient && <p>Loading patient...</p>}

      {renderPatientCard()}
      {renderCompleteModal()}
      {renderRejectModal()}
    </div>
  )
}

export default AdminPatient
