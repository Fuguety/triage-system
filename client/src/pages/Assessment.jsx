import { useState } from "react"
import { Link } from "react-router-dom"
import "../styles/assessment.css"
import { getPriorityMeta } from "../utils/priority"



function Assessment()
{
  const [patientId, setPatientId] = useState("")
  const [healthInsurance, setHealthInsurance] = useState("")
  const [patientNumber, setPatientNumber] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [question, setQuestion] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function startAssessment(useAnonymous)
  {
    try
    {
      setLoading(true)
      setError("")
      setResult(null)

      const response = await fetch("/triage/start",
      {
        method: "POST",
        headers:
        {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
        {
          patientId: useAnonymous ? "" : patientId,
          healthInsurance: useAnonymous ? "" : healthInsurance
        })
      })

      const data = await response.json()

      if (!response.ok)
      {
        throw new Error(data.error || "Failed to start assessment")
      }

      setSessionId(data.sessionId)
      setPatientNumber(String(data.patientNumber))
      setQuestion(data.question)
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



  async function handleAnswer(answerId)
  {
    try
    {
      setSubmitting(true)
      setError("")

      const response = await fetch("/triage/answer",
      {
        method: "POST",
        headers:
        {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
        {
          sessionId,
          answerId
        })
      })

      const data = await response.json()

      if (!response.ok)
      {
        throw new Error(data.error || "Failed to submit answer")
      }

      if (data.done)
      {
        setResult(data)
        setPatientNumber(String(data.patientNumber))
        setQuestion(null)

        return
      }

      setQuestion(data.question)
    }
    catch (requestError)
    {
      setError(requestError.message)
    }
    finally
    {
      setSubmitting(false)
    }
  }



  function restartAssessment()
  {
    setResult(null)
    setQuestion(null)
    setSessionId("")
    setPatientId("")
    setHealthInsurance("")
    setPatientNumber("")
    setError("")
    setLoading(false)
  }



  const priorityMeta = result ? getPriorityMeta(result.priority) : null

  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/">Back</Link>
        <div>
          <p className="eyebrow">Patient intake</p>
          <h2>Assessment</h2>
        </div>
      </div>

      {loading && <p>Starting assessment...</p>}
      {error && <p className="status error">{error}</p>}

      {!loading && !question && !result && (
        <div className="container assessment-panel intake-panel surface-card">
          <p className="question-label">Patient intake</p>
          <h3>Enter patient details or continue anonymously</h3>
          <p className="section-copy">
            Both fields are optional. If skipped, the system will assign an anonymous patient number.
          </p>
          <div className="form-grid">
            <label className="form-field">
              <span>Patient ID</span>
              <input
                aria-label="Patient ID"
                onChange={event => setPatientId(event.target.value)}
                placeholder="Optional patient ID"
                type="text"
                value={patientId}
              />
            </label>
            <label className="form-field">
              <span>Health insurance</span>
              <input
                aria-label="Health insurance"
                onChange={event => setHealthInsurance(event.target.value)}
                placeholder="Optional insurance"
                type="text"
                value={healthInsurance}
              />
            </label>
          </div>
          <div className="answer-list">
            <button aria-label="Continue with patient details" onClick={() => startAssessment(false)} type="button">
              Continue
            </button>
            <button aria-label="Skip details and continue anonymously" className="secondary-button" onClick={() => startAssessment(true)} type="button">
              Skip And Stay Anonymous
            </button>
          </div>
        </div>
      )}

      {!loading && question && (
        <div className="container assessment-panel question-card">
          <div className="question-topbar">
            <p className="patient-number">Patient number: #{patientNumber}</p>
            <span className="status-badge">Active assessment</span>
          </div>
          <p className="question-label">Current question</p>
          <h3 className="question-title">{question.text}</h3>
          <div className="answer-grid">
            {question.answers.map((answer, index) => (
              <button
                aria-label={`Answer ${answer.label}`}
                className="answer-option"
                disabled={submitting}
                key={answer.id}
                onClick={() => handleAnswer(answer.id)}
                type="button"
              >
                <span className="answer-index">0{index + 1}</span>
                <span>{submitting ? "Submitting..." : answer.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && result && (
        <div className={`container assessment-panel result-card ${priorityMeta?.colorClass || ""}`}>
          <p className="eyebrow">Assessment complete</p>
          <p className="patient-number">Patient number: #{patientNumber}</p>
          <p className="question-label">Assessment complete</p>
          <h3 className="result-title">{priorityMeta?.icon} {priorityMeta?.level} - {priorityMeta?.label}</h3>
          <div className="result-metrics">
            <div className="metric-card">
              <span className="metric-label">Queue position</span>
              <strong>{result.queuePosition}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Status</span>
              <strong>Waiting</strong>
            </div>
          </div>
          <div className="hero-actions">
            <button onClick={restartAssessment} type="button">
              Start New Assessment
            </button>
            <Link className="text-button" to="/queue">View Queue</Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default Assessment
