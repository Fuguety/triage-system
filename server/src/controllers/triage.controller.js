const queueService = require("../services/queue.service");
const triageService = require("../services/triage.service");

exports.startTriage = async (req, res) =>
{
  const { fullName, patientId, healthInsurance } = req.body || {};

  if (fullName !== undefined && typeof fullName !== "string")
  {
    return res.status(400).json({ error: "fullName must be a string" });
  }

  if (patientId !== undefined && typeof patientId !== "string")
  {
    return res.status(400).json({ error: "patientId must be a string" });
  }

  if (healthInsurance !== undefined && typeof healthInsurance !== "string")
  {
    return res.status(400).json({ error: "healthInsurance must be a string" });
  }

  try
  {
    const triageSession = await triageService.startTriage(
    {
      fullName,
      patientId,
      healthInsurance
    });

    return res.json(triageSession);
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};




exports.answerQuestion = async (req, res) =>
{
  const { sessionId, answerId } = req.body || {};

  if (!sessionId)
  {
    return res.status(400).json({ error: "sessionId is required" });
  }

  if (!answerId)
  {
    return res.status(400).json({ error: "answerId is required" });
  }

  try
  {
    const result = await triageService.answerQuestion(sessionId, answerId);

    if (result.done)
    {
      const queueEntry = await queueService.enqueuePatient(result.sessionId, result.priority,
      {
        anonymous: result.anonymous,
        fullName: result.fullName,
        healthInsurance: result.healthInsurance,
        patientId: result.patientId,
        patientNumber: result.patientNumber
      });

      return res.json(
      {
        done: true,
        patientNumber: result.patientNumber,
        sessionId: result.sessionId,
        priority: result.priority,
        queuePosition: queueEntry.queuePosition
      });
    }

    return res.json(result);
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};




exports.getQueue = async (req, res) =>
{
  try
  {
    return res.json(
    {
      priorities: queueService.getPriorityLevels(),
      patients: await queueService.getQueue()
    });
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};






