import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import "../styles/queue.css"
import { getPriorityMeta } from "../utils/priority"



function Queue()
{
  const [queue, setQueue] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() =>
  {
    async function loadQueue()
    {
      try
      {
        setLoading(true)
        setError("")

        const response = await fetch("/triage/queue")
        const data = await response.json()

        if (!response.ok)
        {
          throw new Error(data.error || "Failed to load queue")
        }

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
    }

    loadQueue()
  }, [])

  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/">Back</Link>
        <div>
          <p className="eyebrow">Live queue</p>
          <h2>Current Queue</h2>
        </div>
      </div>

      {loading && <p>Loading queue...</p>}
      {error && <p className="status error">{error}</p>}

      {!loading && !error && queue.length === 0 && (
        <div className="container surface-card empty-state">
          <p>No patients in the queue yet.</p>
        </div>
      )}

      {!loading && queue.length > 0 && (
        <div className="queue-list queue-board">
          {queue.map(patient =>
          {
            const priorityMeta = getPriorityMeta(patient.priority)

            return (
              <div className={`queue-card ${priorityMeta.colorClass}`} key={patient.sessionId}>
                <p className="question-label">Position {patient.queuePosition}</p>
                <h3>{priorityMeta.icon} {priorityMeta.level} - {priorityMeta.label}</h3>
                <p className="queue-session">Color reference: {priorityMeta.hex}</p>
                <p className="queue-session">Patient number: #{patient.patientNumber}</p>
                <div className="queue-footer">
                  <span className="status-badge status-tag">waiting</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Queue
