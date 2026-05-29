import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../styles/assessment.css"
import { answerQuestion, goBackQuestion, startTriage } from "../services/triageService"
import { getPriorityMeta } from "../utils/priority"



function Assessment()
{
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [patientId, setPatientId] = useState("")
  const [healthInsurance, setHealthInsurance] = useState("")
  const [patientNumber, setPatientNumber] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [question, setQuestion] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState([])
  const [selectedMultiAnswers, setSelectedMultiAnswers] = useState([])
  const [showAnswerReview, setShowAnswerReview] = useState(false)
  const [actionLockSeconds, setActionLockSeconds] = useState(0)
  const [autoReturnSeconds, setAutoReturnSeconds] = useState(0)
  const [reviewIdleSeconds, setReviewIdleSeconds] = useState(0)

  useEffect(() =>
  {
    if (!result)
    {
      return undefined
    }

    setActionLockSeconds(5)
    setAutoReturnSeconds(15)

    const countdown = window.setInterval(() =>
    {
      setActionLockSeconds(currentSeconds =>
      {
        if (currentSeconds <= 1)
        {
          window.clearInterval(countdown)

          return 0
        }

        return currentSeconds - 1
      })
    }, 1000)

    return () => window.clearInterval(countdown)
  }, [result])



  useEffect(() =>
  {
    if (!result || showAnswerReview)
    {
      return undefined
    }

    const countdown = window.setInterval(() =>
    {
      setAutoReturnSeconds(currentSeconds =>
      {
        if (currentSeconds <= 1)
        {
          window.clearInterval(countdown)
          navigate("/")

          return 0
        }

        return currentSeconds - 1
      })
    }, 1000)

    return () => window.clearInterval(countdown)
  }, [navigate, result, showAnswerReview])



  useEffect(() =>
  {
    if (!result || !showAnswerReview)
    {
      return undefined
    }

    function resetReviewTimer()
    {
      setReviewIdleSeconds(15)
    }

    setReviewIdleSeconds(15)

    window.addEventListener("click", resetReviewTimer)
    window.addEventListener("keydown", resetReviewTimer)
    window.addEventListener("pointermove", resetReviewTimer)
    window.addEventListener("touchstart", resetReviewTimer)

    const countdown = window.setInterval(() =>
    {
      setReviewIdleSeconds(currentSeconds =>
      {
        if (currentSeconds <= 1)
        {
          window.clearInterval(countdown)
          navigate("/")

          return 0
        }

        return currentSeconds - 1
      })
    }, 1000)

    return () =>
    {
      window.clearInterval(countdown)
      window.removeEventListener("click", resetReviewTimer)
      window.removeEventListener("keydown", resetReviewTimer)
      window.removeEventListener("pointermove", resetReviewTimer)
      window.removeEventListener("touchstart", resetReviewTimer)
    }
  }, [navigate, result, showAnswerReview])



  function resetAssessmentState()
  {
    setResult(null)
    setQuestion(null)
    setSessionId("")
    setPatientNumber("")
    setError("")
    setLoading(false)
    setSubmitting(false)
    setSelectedAnswers([])
    setSelectedMultiAnswers([])
    setShowAnswerReview(false)
    setActionLockSeconds(0)
    setAutoReturnSeconds(0)
    setReviewIdleSeconds(0)
  }



  async function startAssessment(useAnonymous)
  {
    try
    {
      setLoading(true)
      setError("")
      setResult(null)
      setSelectedAnswers([])
      setSelectedMultiAnswers([])
      setShowAnswerReview(false)
      setActionLockSeconds(0)
      setAutoReturnSeconds(0)
      setReviewIdleSeconds(0)

      const data = await startTriage(
      {
        fullName: useAnonymous ? "" : fullName,
        patientId: useAnonymous ? "" : patientId,
        healthInsurance: useAnonymous ? "" : healthInsurance
      })

      setSessionId(data.sessionId)
      setPatientNumber(String(data.patientNumber))
      setQuestion(data.question)
      setSelectedMultiAnswers([])
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
    const answeredQuestion = question
    const selectedAnswerLabels = Array.isArray(answerId)
      ? answeredQuestion.answers.filter(answer => answerId.includes(answer.id)).map(answer => answer.label)
      : answeredQuestion.answers.filter(answer => answer.id === answerId).map(answer => answer.label)

    try
    {
      setSubmitting(true)
      setError("")

      const data = await answerQuestion(sessionId, answerId)
      const answerRecord =
      {
        answer: selectedAnswerLabels.length ? selectedAnswerLabels.join(", ") : String(answerId),
        question: answeredQuestion.text
      }

      setSelectedAnswers(currentAnswers => [...currentAnswers, answerRecord])

      if (data.done)
      {
        setResult(data)
        setPatientNumber(String(data.patientNumber))
        setQuestion(null)

        return
      }

      setQuestion(data.question)
      setSelectedMultiAnswers([])
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
    resetAssessmentState()
    setFullName("")
    setPatientId("")
    setHealthInsurance("")
  }



  function toggleMultiAnswer(answerId)
  {
    setSelectedMultiAnswers(currentAnswers =>
    {
      if (answerId === "none")
      {
        return currentAnswers.includes("none") ? [] : ["none"]
      }

      const answersWithoutNone = currentAnswers.filter(currentAnswer => currentAnswer !== "none")

      if (answersWithoutNone.includes(answerId))
      {
        return answersWithoutNone.filter(currentAnswer => currentAnswer !== answerId)
      }

      return [...answersWithoutNone, answerId]
    })
  }



  async function submitMultiAnswer()
  {
    await handleAnswer(selectedMultiAnswers)
  }



  async function backQuestion()
  {
    if (!sessionId || selectedAnswers.length === 0 || result)
    {
      return
    }

    try
    {
      setSubmitting(true)
      setError("")

      const data = await goBackQuestion(sessionId)

      setQuestion(data.question)
      setSelectedAnswers(currentAnswers => currentAnswers.slice(0, -1))
      setSelectedMultiAnswers([])
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



  function reviewAnswers()
  {
    setShowAnswerReview(true)
    setAutoReturnSeconds(0)
  }



  function finishReview()
  {
    navigate("/")
  }



  function renderIntakeForm()
  {
    if (loading || question || result)
    {
      return null
    }

    return (
      <div className="container assessment-panel intake-panel surface-card">
        <p className="question-label">Patient intake</p>
        <h3>Enter patient details or continue anonymously</h3>
        <p className="section-copy">
          All fields are optional. If skipped, the system will assign an anonymous patient number.
        </p>

        <div className="form-grid">
          <label className="form-field">
            <span>Full Name</span>
            <input
              aria-label="Full Name"
              onChange={event => setFullName(event.target.value)}
              placeholder="Optional full name"
              type="text"
              value={fullName}
            />
          </label>

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
    )
  }



  function renderQuestionCard()
  {
    if (loading || !question)
    {
      return null
    }

    const isYesNoQuestion = question.answers.length === 2
      && question.answers.some(answer => answer.id === "yes")
      && question.answers.some(answer => answer.id === "no")
    const answerGridClassName = isYesNoQuestion ? "answer-grid yes-no-answer-grid" : "answer-grid"
    const isMultiSelectQuestion = question.type === "multi_select"

    return (
      <div className="container assessment-panel question-card">
        <div className="question-topbar">
          <p className="patient-number">Patient number: #{patientNumber}</p>
          <span className="status-badge">Active assessment</span>
        </div>

        <p className="question-label">Current question</p>
        <h3 className="question-title">{question.text}</h3>

        {isMultiSelectQuestion ? renderMultiSelectAnswers() : (
          <div className={answerGridClassName}>
            {question.answers.map(answer => (
              <button
                aria-label={`${answer.label}. ${question.text}`}
                className="answer-option"
                disabled={submitting}
                key={answer.id}
                onClick={() => handleAnswer(answer.id)}
                type="button"
              >
                {submitting ? "Submitting..." : answer.label}
              </button>
            ))}
          </div>
        )}

        {renderQuestionActions()}
      </div>
    )
  }



  function renderMultiSelectAnswers()
  {
    return (
      <div className="answer-grid multi-answer-grid">
        {question.answers.map(answer =>
        {
          const checked = selectedMultiAnswers.includes(answer.id)

          return (
            <label className={`answer-option checkbox-answer ${checked ? "selected-answer" : ""}`} key={answer.id}>
              <input
                checked={checked}
                disabled={submitting}
                onChange={() => toggleMultiAnswer(answer.id)}
                type="checkbox"
              />
              <span>{answer.label}</span>
            </label>
          )
        })}

        <button disabled={submitting || selectedMultiAnswers.length === 0} onClick={submitMultiAnswer} type="button">
          Continue
        </button>
      </div>
    )
  }



  function renderQuestionActions()
  {
    if (selectedAnswers.length === 0)
    {
      return null
    }

    return (
      <div className="hero-actions question-actions">
        <button className="secondary-button" disabled={submitting} onClick={backQuestion} type="button">
          Back Question
        </button>
      </div>
    )
  }



  function renderResultMetrics()
  {
    return (
      <div className="result-metrics">
        <div className="metric-card">
          <span className="metric-label">Calculated priority</span>
          <strong>{result.priority}</strong>
        </div>

        <div className="metric-card">
          <span className="metric-label">Patient number</span>
          <strong>#{patientNumber}</strong>
        </div>

        <div className="metric-card">
          <span className="metric-label">Queue position</span>
          <strong>{result.queuePosition}</strong>
        </div>

        <div className="metric-card">
          <span className="metric-label">Status</span>
          <strong>Waiting</strong>
        </div>
      </div>
    )
  }



  function renderAnswerReview()
  {
    if (!showAnswerReview)
    {
      return null
    }

    return (
      <div className="answer-review">
        <p className="question-label">Selected answers</p>
        {selectedAnswers.length === 0 && <p>No answers recorded for review.</p>}

        {selectedAnswers.length > 0 && (
          <ul>
            {selectedAnswers.map((selectedAnswer, index) => (
              <li key={`${selectedAnswer.question}-${index}`}>
                <span>{selectedAnswer.question}</span>
                <strong>{selectedAnswer.answer}</strong>
              </li>
            ))}
          </ul>
        )}

        <div className="hero-actions review-actions">
          <button onClick={finishReview} type="button">
            Finish Review
          </button>
        </div>
      </div>
    )
  }



  function renderResultCountdown()
  {
    if (!showAnswerReview && autoReturnSeconds > 0)
    {
      return (
        <p className="cooldown-copy" role="status">
          Returning to Home in {autoReturnSeconds} seconds.
        </p>
      )
    }

    if (showAnswerReview && reviewIdleSeconds > 0)
    {
      return (
        <p className="cooldown-copy" role="status">
          Review will finish automatically in {reviewIdleSeconds} seconds without activity.
        </p>
      )
    }

    return null
  }



  function renderResultActions()
  {
    return (
      <div className="hero-actions result-actions">
        <Link className="text-button" to="/">Exit to Main Menu</Link>

        <button disabled={actionLockSeconds > 0} onClick={restartAssessment} type="button">
          {actionLockSeconds > 0 ? `Start New Assessment (${actionLockSeconds}s)` : "Start New Assessment"}
        </button>

        {!showAnswerReview && (
          <button className="secondary-button" onClick={reviewAnswers} type="button">
            Review Answers
          </button>
        )}

        <Link className="text-button" to="/queue">View Queue</Link>
      </div>
    )
  }



  function renderResultCard()
  {
    if (loading || !result)
    {
      return null
    }

    const priorityMeta = getPriorityMeta(result.priority)

    return (
      <div className={`container assessment-panel result-card ${priorityMeta?.colorClass || ""}`}>
        <p className="eyebrow">Assessment complete</p>
        <p className="patient-number">Patient number: #{patientNumber}</p>
        <p className="question-label">Assessment complete</p>
        <h3 className="result-title">{priorityMeta?.icon} {priorityMeta?.level} - {priorityMeta?.label}</h3>
        <p className="section-copy result-message">
          Your assessment has been completed. Please wait for staff review.
        </p>

        {renderResultMetrics()}
        {renderAnswerReview()}
        {renderResultCountdown()}
        {renderResultActions()}
      </div>
    )
  }



  return (
    <div className="shell">
      <div className="page-header">
        {question && !result && (
          <Link aria-label="Cancel assessment and return to Home" className="back-link" to="/">Cancel Assessment</Link>
        )}

        <div>
          <p className="eyebrow">Patient intake</p>
          <h2>Assessment</h2>
        </div>
      </div>

      {loading && <p>Starting assessment...</p>}
      {error && <p className="status error">{error}</p>}

      {renderIntakeForm()}
      {renderQuestionCard()}
      {renderResultCard()}
    </div>
  )
}

export default Assessment
