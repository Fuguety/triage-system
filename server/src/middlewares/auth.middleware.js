const authService = require("../services/auth.service");

function requireHospitalAccess(req, res, next)
{
  const authorizationHeader = req.headers.authorization || "";
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : "";

  if (!token)
  {
    return res.status(401).json({ error: "Authorization token is required" });
  }

  try
  {
    req.user = authService.verifyToken(token);

    if (!["hospital_staff", "admin"].includes(req.user.role))
    {
      return res.status(403).json({ error: "Insufficient role" });
    }

    return next();
  }
  catch (error)
  {
    return res.status(error.statusCode || 401).json({ error: error.message });
  }
}

module.exports = {
  requireHospitalAccess
};
