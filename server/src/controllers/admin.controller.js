const queueService = require("../services/queue.service");
const auditService = require("../services/audit.service");

exports.getQueue = (req, res) =>
{
  res.json(
  {
    hospital: req.user.hospitalName,
    patients: queueService.getAdminQueue()
  });
};



exports.getQueuePatient = (req, res) =>
{
  try
  {
    return res.json(queueService.getPatient(req.params.sessionId));
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};



exports.getAuditLog = (req, res) =>
{
  res.json(
  {
    entries: auditService.getAuditLog()
  });
};



exports.updateQueuePatient = (req, res) =>
{
  const { patientId, healthInsurance, aboutDetails } = req.body || {};

  if (patientId !== undefined && typeof patientId !== "string")
  {
    return res.status(400).json({ error: "patientId must be a string" });
  }

  if (healthInsurance !== undefined && typeof healthInsurance !== "string")
  {
    return res.status(400).json({ error: "healthInsurance must be a string" });
  }

  if (aboutDetails !== undefined && typeof aboutDetails !== "string")
  {
    return res.status(400).json({ error: "aboutDetails must be a string" });
  }

  try
  {
    const result = queueService.updatePatient(req.params.sessionId,
    {
      patientId,
      healthInsurance,
      aboutDetails
    });

    auditService.recordAction(
    {
      action: "patient_details_edited",
      actorName: req.user.hospitalName,
      actorRole: req.user.role,
      details:
      {
        aboutDetails: result.aboutDetails,
        patientId: result.patientId,
        healthInsurance: result.healthInsurance
      },
      sessionId: req.params.sessionId
    });

    return res.json(result);
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};



exports.startAssessingPatient = (req, res) =>
{
  try
  {
    const result = queueService.startAssessing(req.params.sessionId);

    auditService.recordAction(
    {
      action: "staff_accepted_patient",
      actorName: req.user.hospitalName,
      actorRole: req.user.role,
      sessionId: req.params.sessionId
    });

    return res.json(result);
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};



exports.completeQueuePatient = (req, res) =>
{
  try
  {
    const result = queueService.resolvePatient(req.params.sessionId, "completed");

    auditService.recordAction(
    {
      action: "staff_completed_assessment",
      actorName: req.user.hospitalName,
      actorRole: req.user.role,
      sessionId: req.params.sessionId
    });

    return res.json(result);
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};



exports.rejectQueuePatient = (req, res) =>
{
  try
  {
    const result = queueService.resolvePatient(req.params.sessionId, "rejected");

    auditService.recordAction(
    {
      action: "staff_rejected_patient",
      actorName: req.user.hospitalName,
      actorRole: req.user.role,
      sessionId: req.params.sessionId
    });

    return res.json(result);
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
