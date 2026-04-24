const { pool } = require("../db/database");



async function recordAction(entry)
{
  await pool.query(
    `INSERT INTO audit_logs
    (actor_name, actor_role, action, details, session_id)
    VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.actorName,
      entry.actorRole,
      entry.action,
      entry.details || {},
      entry.sessionId || null
    ]
  );
}



async function getAuditLog()
{
  const result = await pool.query(
    `SELECT
      action,
      actor_name,
      actor_role,
      details,
      session_id,
      created_at
    FROM audit_logs
    ORDER BY created_at DESC`
  );

  return result.rows.map(row =>
  {
    return {
      action: row.action,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      details: row.details || {},
      sessionId: row.session_id,
      timestamp: row.created_at
    };
  });
}



async function resetAuditLog()
{
  await pool.query("DELETE FROM audit_logs");
}



module.exports =
{
  getAuditLog,
  recordAction,
  resetAuditLog
};
