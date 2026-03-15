import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

function Assessment()
{
  const [sessionId, setSessionId] = useState("")
  const [question, setQuestion] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() =>
  {
    async function startAssessment()
    {
      try
      {
        setLoading(true)
        setError("")

        const response = await fetch("/triage/start",
        {
          method: "POST"
        })

        const data = await response.json()

        if (!response.ok)
        {
          throw new Error(data.error || "Failed to start assessment")
        }

        setSessionId(data.sessionId)
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

    startAssessment()
  }, [])

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

  async function restartAssessment()
  {
    setResult(null)
    setQuestion(null)
    setSessionId("")

    try
    {
      setLoading(true)
      setError("")

      const response = await fetch("/triage/start",
      {
        method: "POST"
      })

      const data = await response.json()

      if (!response.ok)
      {
        throw new Error(data.error || "Failed to restart assessment")
      }

      setSessionId(data.sessionId)
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

  return (
    <div className="container">
      <Link className="back-link" to="/">Back</Link>
      <h2>Patient Assessment</h2>

      {loading && <p>Starting assessment...</p>}

      {error && <p className="status error">{error}</p>}

      {!loading && question && (
        <div className="assessment-panel">
          <p className="question-label">Current question</p>
          <h3>{question.text}</h3>
          <div className="answer-list">
            {question.answers.map(answer => (
              <button
                key={answer.id}
                onClick={() => handleAnswer(answer.id)}
                disabled={submitting}
                type="button"
              >
                {submitting ? "Submitting..." : answer.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && result && (
        <div className="assessment-panel">
          <p className="question-label">Assessment complete</p>
          <h3>{result.priority}</h3>
          <p>Queue position: {result.queuePosition}</p>
          <button onClick={restartAssessment} type="button">
            Start New Assessment
          </button>
        </div>
      )}
    </div>
  )
}

export default Assessment
