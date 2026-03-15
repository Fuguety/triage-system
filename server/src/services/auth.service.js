const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const hospitals = new Map();

const JWT_SECRET = process.env.JWT_SECRET || "triage-dev-secret";

function seedTestHospital()
{
  const email = "debug@triage.local";

  hospitals.set(email,
  {
    id: "debug-hospital",
    name: "Debug Hospital",
    email,
    role: "admin",
    passwordHash: bcrypt.hashSync("debug123", 10)
  });
}

function createError(message, statusCode)
{
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

function createAuthResponse(hospital)
{
  const token = jwt.sign(
  {
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    role: hospital.role
  },
  JWT_SECRET,
  {
    expiresIn: "8h"
  });

  return {
    token,
    hospital:
    {
      id: hospital.id,
      name: hospital.name,
      email: hospital.email,
      role: hospital.role
    }
  };
}

async function registerHospital(name, email, password)
{
  const normalizedEmail = email.trim().toLowerCase();

  if (hospitals.has(normalizedEmail))
  {
    throw createError("Hospital already registered", 409);
  }

  const hospital =
  {
    id: uuidv4(),
    name: name.trim(),
    email: normalizedEmail,
    role: "hospital_staff",
    passwordHash: await bcrypt.hash(password, 10)
  };

  hospitals.set(normalizedEmail, hospital);

  return createAuthResponse(hospital);
}

async function loginHospital(email, password)
{
  const normalizedEmail = email.trim().toLowerCase();
  const hospital = hospitals.get(normalizedEmail);

  if (!hospital)
  {
    throw createError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(password, hospital.passwordHash);

  if (!passwordMatches)
  {
    throw createError("Invalid email or password", 401);
  }

  return createAuthResponse(hospital);
}

function verifyToken(token)
{
  try
  {
    return jwt.verify(token, JWT_SECRET);
  }
  catch (error)
  {
    throw createError("Invalid token", 401);
  }
}

function resetHospitals()
{
  hospitals.clear();
  seedTestHospital();
}

seedTestHospital();

module.exports = {
  loginHospital,
  registerHospital,
  resetHospitals,
  verifyToken
};
