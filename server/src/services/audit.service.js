const auditLog = [];

function recordAction(entry)
{
  auditLog.unshift(
  {
    action: entry.action,
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    details: entry.details || {},
    sessionId: entry.sessionId || null,
    timestamp: new Date().toISOString()
  });
}

function getAuditLog()
{
  return [...auditLog];
}

function resetAuditLog()
{
  auditLog.length = 0;
}

module.exports = {
  getAuditLog,
  recordAction,
  resetAuditLog
};
