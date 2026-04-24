const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ""



function buildHeaders(options)
{
  const headers =
  {
    ...(options.headers || {})
  }

  if (options.body !== undefined)
  {
    headers["Content-Type"] = "application/json"
  }

  if (options.token)
  {
    headers.Authorization = `Bearer ${options.token}`
  }

  return headers
}



async function parseResponse(response)
{
  const text = await response.text()

  if (!text)
  {
    return null
  }

  return JSON.parse(text)
}



async function apiRequest(path, options = {})
{
  const response = await fetch(`${API_BASE_URL}${path}`,
  {
    method: options.method || "GET",
    headers: buildHeaders(options),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  })

  const data = await parseResponse(response)

  if (!response.ok)
  {
    throw new Error(data?.error || "Request failed")
  }

  return data
}



export { apiRequest }
