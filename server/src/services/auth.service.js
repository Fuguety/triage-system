const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { pool } = require("../db/database");

const JWT_SECRET = process.env.JWT_SECRET || "triage-dev-secret";
const DEBUG_HOSPITAL_EMAIL = "debug@triage.local";
const DEBUG_HOSPITAL_PASSWORD = "debug123";



function createError(message, statusCode)
{
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}



function normalizeEmail(email)
{
  return email.trim().toLowerCase();
}



function mapHospital(row)
{
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash
  };
}



async function findHospitalByEmail(email)
{
  const result = await pool.query(
    `SELECT
      id,
      name,
      email,
      password_hash,
      role
    FROM hospitals
    WHERE email = $1`,
    [email]
  );

  return result.rows[0] ? mapHospital(result.rows[0]) : null;
}



async function ensureDebugHospital()
{
  const passwordHash = await bcrypt.hash(DEBUG_HOSPITAL_PASSWORD, 10);

  await pool.query(
    `INSERT INTO hospitals
    (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role`,
    [
      "Debug Hospital",
      DEBUG_HOSPITAL_EMAIL,
      passwordHash,
      "admin"
    ]
  );
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
  await ensureDebugHospital();

  const normalizedEmail = normalizeEmail(email);
  const existingHospital = await findHospitalByEmail(normalizedEmail);

  if (existingHospital)
  {
    throw createError("Hospital already registered", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO hospitals
    (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, password_hash, role`,
    [
      name.trim(),
      normalizedEmail,
      passwordHash,
      "hospital_staff"
    ]
  );

  return createAuthResponse(mapHospital(result.rows[0]));
}



async function loginHospital(email, password)
{
  await ensureDebugHospital();

  const normalizedEmail = normalizeEmail(email);
  const hospital = await findHospitalByEmail(normalizedEmail);

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



async function resetHospitals()
{
  await pool.query("DELETE FROM hospitals");
  await ensureDebugHospital();
}



module.exports =
{
  loginHospital,
  registerHospital,
  resetHospitals,
  verifyToken
};
