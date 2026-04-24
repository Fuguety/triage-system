import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import "../styles/admin.css"
import { getAuditLog } from "../services/adminService"
import { getStoredToken } from "../services/authService"

function AdminAudit()
{
  const [entries, setEntries] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const token = getStoredToken()

  const loadAudit = useCallback(async () =>
  {
    try
    {
      setLoading(true)
      setError("")

      const data = await getAuditLog(token)

      setEntries(data.entries)
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
      loadAudit()
    }
  }, [loadAudit, token])

  return (
    <div className="shell">
      <div className="page-header">
        <Link className="back-link" to="/admin">Back To Admin</Link>
        <div>
          <p className="eyebrow">Traceability</p>
          <h2>Audit Log</h2>
        </div>
      </div>

      <div className="container admin-container admin-audit">
        {!token && <p className="status error">Login to view audit log.</p>}
        {error && <p className="status error">{error}</p>}
        {loading && <p>Loading audit log...</p>}

        {!loading && token && entries.length === 0 && <p>No audit events yet.</p>}

        {!loading && entries.length > 0 && (
          <div className="audit-list">
            {entries.map((entry, index) => (
              <div aria-label={`Audit event ${entry.action}`} className="audit-item" key={`${entry.timestamp}-${index}`}>
                <strong>{entry.action}</strong>
                <span>{entry.actorName} ({entry.actorRole})</span>
                <span>{entry.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAudit
