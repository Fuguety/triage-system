import { apiRequest } from "./api"



function getAdminQueue(token)
{
  return apiRequest("/admin/queue",
  {
    token
  })
}



function getQueuePatient(token, sessionId)
{
  return apiRequest(`/admin/queue/${sessionId}`,
  {
    token
  })
}



function getAuditLog(token)
{
  return apiRequest("/admin/audit",
  {
    token
  })
}



function updateQueuePatient(token, sessionId, patientDetails)
{
  return apiRequest(`/admin/queue/${sessionId}`,
  {
    method: "PATCH",
    token,
    body: patientDetails
  })
}



function updateQueueStatus(token, sessionId, action)
{
  return apiRequest(`/admin/queue/${sessionId}/${action}`,
  {
    method: "POST",
    token
  })
}



function startAssessingPatient(token, sessionId)
{
  return updateQueueStatus(token, sessionId, "assess")
}



function completeQueuePatient(token, sessionId)
{
  return updateQueueStatus(token, sessionId, "complete")
}



function rejectQueuePatient(token, sessionId)
{
  return updateQueueStatus(token, sessionId, "reject")
}



export
{
  completeQueuePatient,
  getAdminQueue,
  getAuditLog,
  getQueuePatient,
  rejectQueuePatient,
  startAssessingPatient,
  updateQueuePatient,
  updateQueueStatus
}
