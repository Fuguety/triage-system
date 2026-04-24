const queueService = require("../services/queue.service");
const auditService = require("../services/audit.service");

exports.getQueue = async (req, res) =>
{
  try
  {
    return res.json(
    {
      hospital: req.user.hospitalName,
      patients: await queueService.getAdminQueue()
    });
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};



exports.getQueuePatient = async (req, res) =>
{
  try
  {
    return res.json(await queueService.getPatient(req.params.sessionId));
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};



exports.getAuditLog = async (req, res) =>
{
  try
  {
    return res.json(
    {
      entries: await auditService.getAuditLog()
    });
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};



exports.updateQueuePatient = async (req, res) =>
{
  const { fullName, patientId, healthInsurance, aboutDetails } = req.body || {};

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

  if (aboutDetails !== undefined && typeof aboutDetails !== "string")
  {
    return res.status(400).json({ error: "aboutDetails must be a string" });
  }

  try
  {
    const result = await queueService.updatePatient(req.params.sessionId,
    {
      fullName,
      patientId,
      healthInsurance,
      aboutDetails
    });

    await auditService.recordAction(
    {
      action: "patient_details_edited",
      actorName: req.user.hospitalName,
      actorRole: req.user.role,
      details:
      {
        aboutDetails: result.aboutDetails,
        fullName: result.fullName,
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



exports.startAssessingPatient = async (req, res) =>
{
  try
  {
    const result = await queueService.startAssessing(req.params.sessionId);

    await auditService.recordAction(
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



exports.completeQueuePatient = async (req, res) =>
{
  try
  {
    const result = await queueService.resolvePatient(req.params.sessionId, "completed");

    await auditService.recordAction(
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



exports.rejectQueuePatient = async (req, res) =>
{
  try
  {
    const result = await queueService.resolvePatient(req.params.sessionId, "rejected");

    await auditService.recordAction(
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
