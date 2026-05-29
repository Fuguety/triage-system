import { apiRequest } from "./api"



async function startTriage(patientDetails)
{
  return apiRequest("/triage/start",
  {
    method: "POST",
    body: patientDetails
  })
}



async function answerQuestion(sessionId, answerId)
{
  return apiRequest("/triage/answer",
  {
    method: "POST",
    body:
    {
      sessionId,
      answerId
    }
  })
}



async function goBackQuestion(sessionId)
{
  return apiRequest("/triage/back",
  {
    method: "POST",
    body:
    {
      sessionId
    }
  })
}



async function getPublicQueue()
{
  return apiRequest("/triage/queue")
}



export
{
  answerQuestion,
  getPublicQueue,
  goBackQuestion,
  startTriage
}
