const queueService = require("../services/queue.service");
const triageService = require("../services/triage.service");

exports.startTriage = (req, res) =>
{
  const triageSession = triageService.startTriage();

  res.json(triageSession);
};

exports.answerQuestion = (req, res) =>
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
    const result = triageService.answerQuestion(sessionId, answerId);

    if (result.done)
    {
      const queueEntry = queueService.enqueuePatient(result.sessionId, result.priority);

      return res.json(
      {
        done: true,
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

exports.getQueue = (req, res) =>
{
  res.json(
  {
    priorities: queueService.getPriorityLevels(),
    patients: queueService.getQueue()
  });
};






