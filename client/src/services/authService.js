import { apiRequest } from "./api"

const TOKEN_KEY = "triage-admin-token"
const HOSPITAL_KEY = "triage-admin-hospital"



function getStoredToken()
{
  return localStorage.getItem(TOKEN_KEY) || ""
}



function getStoredHospital()
{
  const value = localStorage.getItem(HOSPITAL_KEY)

  if (!value)
  {
    return null
  }

  try
  {
    return JSON.parse(value)
  }
  catch
  {
    return null
  }
}



function storeAuth(authToken, authHospital)
{
  localStorage.setItem(TOKEN_KEY, authToken)
  localStorage.setItem(HOSPITAL_KEY, JSON.stringify(authHospital))
}



function clearAuth()
{
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(HOSPITAL_KEY)
}



async function loginHospital(email, password)
{
  return apiRequest("/auth/login",
  {
    method: "POST",
    body:
    {
      email,
      password
    }
  })
}



async function registerHospital(name, email, password)
{
  return apiRequest("/auth/register",
  {
    method: "POST",
    body:
    {
      name,
      email,
      password
    }
  })
}



async function loginDebugHospital()
{
  return loginHospital("debug@triage.local", "debug123")
}



export
{
  clearAuth,
  getStoredHospital,
  getStoredToken,
  loginDebugHospital,
  loginHospital,
  registerHospital,
  storeAuth
}
