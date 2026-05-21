import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import "../styles/queue.css"
import { getPublicQueue } from "../services/triageService"
import { getPriorityMeta } from "../utils/priority"



function renderQueueCard(patient)
{
  const priorityMeta = getPriorityMeta(patient.priority)

  return (
    <div className={`queue-card ${priorityMeta.colorClass}`} key={patient.sessionId}>
      <p className="question-label">Position {patient.queuePosition}</p>
      <h3>{priorityMeta.icon} {priorityMeta.level} - {priorityMeta.label}</h3>
      <p className="queue-session">Patient number: #{patient.patientNumber}</p>

      <div className="queue-footer">
        <span className="status-badge status-tag">{patient.status}</span>
      </div>
    </div>
  )
}



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

        const data = await getPublicQueue()

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



  function renderQueueList()
  {
    if (loading || queue.length === 0)
    {
      return null
    }

    return (
      <div className="queue-list queue-board">
        {queue.map(renderQueueCard)}
      </div>
    )
  }



  function renderEmptyState()
  {
    if (loading || error || queue.length > 0)
    {
      return null
    }

    return (
      <div className="container surface-card empty-state">
        <p>No patients in the queue yet.</p>
      </div>
    )
  }



  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/">{"\u2190 Back"}</Link>

        <div>
          <p className="eyebrow">Live queue</p>
          <h2>Current Queue</h2>
        </div>
      </div>

      {loading && <p>Loading queue...</p>}
      {error && <p className="status error">{error}</p>}

      {renderEmptyState()}
      {renderQueueList()}
    </div>
  )
}

export default Queue
