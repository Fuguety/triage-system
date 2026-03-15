import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

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
    <div className="container">
      <Link className="back-link" to="/">Back</Link>
      <h2>Current Queue</h2>

      {loading && <p>Loading queue...</p>}
      {error && <p className="status error">{error}</p>}

      {!loading && !error && queue.length === 0 && (
        <p>No patients in the queue yet.</p>
      )}

      {!loading && queue.length > 0 && (
        <div className="queue-list">
          {queue.map(patient => (
            <div className="queue-card" key={patient.sessionId}>
              <p className="question-label">Position {patient.queuePosition}</p>
              <h3>{patient.priority}</h3>
              <p className="queue-session">Session: {patient.sessionId}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Queue
