const test = require("node:test");
const assert = require("node:assert/strict");

const app = require("../app");

const originalFetch = global.fetch;
const originalHuggingFaceToken = process.env.HF_TOKEN;
const originalHuggingFaceModel = process.env.HF_MODEL;



function restoreEnvironment()
{
  global.fetch = originalFetch;

  if (originalHuggingFaceToken === undefined)
  {
    delete process.env.HF_TOKEN;
  }
  else
  {
    process.env.HF_TOKEN = originalHuggingFaceToken;
  }

  if (originalHuggingFaceModel === undefined)
  {
    delete process.env.HF_MODEL;
  }
  else
  {
    process.env.HF_MODEL = originalHuggingFaceModel;
  }
}




function startTestServer()
{
  return new Promise(resolve =>
  {
    const server = app.listen(0, () =>
    {
      resolve(server);
    });
  });
}




function stopTestServer(server)
{
  return new Promise(resolve =>
  {
    server.close(resolve);
  });
}




async function requestJson(server, path)
{
  const address = server.address();
  const response = await originalFetch(`http://127.0.0.1:${address.port}${path}`);

  return response.json();
}




test.afterEach(() =>
{
  restoreEnvironment();
});




test("reports AI health as failed when HF_TOKEN is missing", async () =>
{
  delete process.env.HF_TOKEN;

  const server = await startTestServer();

  try
  {
    const payload = await requestJson(server, "/health/ai");

    assert.deepEqual(payload,
    {
      configured: false,
      model: "openai/gpt-oss-20b",
      status: "failed",
      message: "HF_TOKEN is not configured."
    });
  }
  finally
  {
    await stopTestServer(server);
  }
});




test("reports AI health as ok when Hugging Face responds", async () =>
{
  process.env.HF_TOKEN = "test-token";
  process.env.HF_MODEL = "openai/gpt-oss-20b";
  global.fetch = async () =>
  {
    return {
      ok: true,
      async json()
      {
        return {
          choices:
          [
            {
              message:
              {
                content: "{}"
              }
            }
          ]
        };
      }
    };
  };

  const server = await startTestServer();

  try
  {
    const payload = await requestJson(server, "/health/ai");

    assert.deepEqual(payload,
    {
      configured: true,
      model: "openai/gpt-oss-20b",
      status: "ok",
      message: "Hugging Face responded successfully."
    });
  }
  finally
  {
    await stopTestServer(server);
  }
});
