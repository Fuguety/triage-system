const authService = require("../services/auth.service");
const auditService = require("../services/audit.service");

function validateBody(body)
{
  const { name, email, password } = body || {};

  if (name !== undefined && typeof name !== "string")
  {
    return "name must be a string";
  }

  if (!email || typeof email !== "string")
  {
    return "email is required";
  }

  if (!password || typeof password !== "string")
  {
    return "password is required";
  }

  return null;
}

exports.registerHospital = async (req, res) =>
{
  const validationError = validateBody(req.body);

  if (validationError)
  {
    return res.status(400).json({ error: validationError });
  }

  if (!req.body.name || !req.body.name.trim())
  {
    return res.status(400).json({ error: "name is required" });
  }

  try
  {
    const result = await authService.registerHospital(req.body.name, req.body.email, req.body.password);

    auditService.recordAction(
    {
      action: "hospital_registered",
      actorName: result.hospital.name,
      actorRole: result.hospital.role
    });

    return res.status(201).json(result);
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.loginHospital = async (req, res) =>
{
  const validationError = validateBody(req.body);

  if (validationError)
  {
    return res.status(400).json({ error: validationError });
  }

  try
  {
    const result = await authService.loginHospital(req.body.email, req.body.password);

    auditService.recordAction(
    {
      action: "hospital_logged_in",
      actorName: result.hospital.name,
      actorRole: result.hospital.role
    });

    return res.json(result);
  }
  catch (error)
  {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
