const test = require("node:test");
const assert = require("node:assert/strict");

const aiService = require("./ai.service");

const originalFetch = global.fetch;
const originalHuggingFaceToken = process.env.HF_TOKEN;
const originalHuggingFaceModel = process.env.HF_MODEL;
const originalConsoleWarn = console.warn;



test.afterEach(() =>
{
  global.fetch = originalFetch;
  console.warn = originalConsoleWarn;

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
});




test("returns fallback when HF_TOKEN is missing", async () =>
{
  delete process.env.HF_TOKEN;

  const result = await aiService.generateTriageBrief(
  {
    symptomsSummary: "chief_complaint: fever",
    ruleBasedPriority: "URGENT"
  });

  assert.deepEqual(result,
  {
    brief: "Main symptom: Fever. Onset: Not provided. Allergies: Not provided. Medical conditions: Not provided.",
    suggestedPriority: "URGENT",
    reason: "AI service unavailable. Rule-based priority used.",
    riskFactors: []
  });
});




test("returns fallback when AI JSON is invalid", async () =>
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
                content: "not json"
              }
            }
          ]
        };
      }
    };
  };

  const result = await aiService.generateTriageBrief(
  {
    symptomsSummary: "chief_complaint: chest_pain",
    ruleBasedPriority: "EMERGENT"
  });

  assert.deepEqual(result,
  {
    brief: "Main symptom: Chest pain. Onset: Not provided. Allergies: Not provided. Medical conditions: Not provided.",
    suggestedPriority: "EMERGENT",
    reason: "AI service unavailable. Rule-based priority used.",
    riskFactors: []
  });
});



test("sends readable multi-select patient context to Hugging Face", async () =>
{
  let requestBody = null;

  process.env.HF_TOKEN = "test-token";
  process.env.HF_MODEL = "openai/gpt-oss-20b";
  global.fetch = async (url, options) =>
  {
    requestBody = JSON.parse(options.body);

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
                content: JSON.stringify(
                {
                  brief: "Readable context received.",
                  suggestedPriority: "URGENT",
                  reason: "Readable multi-select answers were included.",
                  riskFactors:
                  [
                    "Wheat allergy",
                    "Asthma"
                  ]
                })
              }
            }
          ]
        };
      }
    };
  };

  await aiService.generateTriageBrief(
  {
    symptomsSummary: [
      "gender: female",
      "age_group: young_adult",
      "allergy_details: wheat_allergy,dust_allergy",
      "comorbidities: asthma,diabetes",
      "chief_complaint: fever",
      "symptom_onset: one_to_three_days"
    ].join("\n"),
    ruleBasedPriority: "URGENT"
  });

  const userMessage = requestBody.messages.find(message => message.role === "user");
  const promptBody = JSON.parse(userMessage.content);

  assert.equal(promptBody.patientContext.gender, "Female");
  assert.equal(promptBody.patientContext.age, "18-39 years");
  assert.equal(promptBody.patientContext.allergies, "Wheat allergy, Dust allergy");
  assert.equal(promptBody.patientContext.medicalConditions, "Asthma, Diabetes");
  assert.equal(promptBody.patientContext.mainSymptom, "Fever");
  assert.equal(promptBody.patientContext.onsetTime, "1-3 days ago");
  assert.equal(promptBody.patientContext.ruleBasedPriority, "URGENT");
});



test("uses plain prompt first for openai gpt oss model", async () =>
{
  let requestCount = 0;
  const responseFormats = [];
  const warningMessages = [];

  process.env.HF_TOKEN = "test-token";
  process.env.HF_MODEL = "openai/gpt-oss-20b";
  console.warn = (...messageParts) =>
  {
    warningMessages.push(messageParts);
  };
  global.fetch = async (url, options) =>
  {
    requestCount += 1;

    const requestBody = JSON.parse(options.body);

    responseFormats.push(requestBody.response_format);

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
                content: JSON.stringify(
                {
                  brief: "Plain prompt succeeded.",
                  suggestedPriority: "URGENT",
                  reason: "The first plain response was valid JSON.",
                  riskFactors:
                  [
                    "Fever"
                  ]
                })
              }
            }
          ]
        };
      }
    };
  };

  const result = await aiService.generateTriageBrief(
  {
    symptomsSummary: "chief_complaint: fever",
    ruleBasedPriority: "URGENT"
  });

  assert.equal(requestCount, 1);
  assert.deepEqual(responseFormats,
  [
    undefined
  ]);
  assert.deepEqual(result,
  {
    brief: "Plain prompt succeeded.",
    suggestedPriority: "URGENT",
    reason: "The first plain response was valid JSON.",
    riskFactors:
    [
      "Fever"
    ]
  });
  assert.deepEqual(warningMessages, []);
});



test("does not warn when JSON mode fails but plain retry succeeds", async () =>
{
  let requestCount = 0;
  const responseFormats = [];
  const warningMessages = [];

  process.env.HF_TOKEN = "test-token";
  process.env.HF_MODEL = "example/chat-model";
  console.warn = (...messageParts) =>
  {
    warningMessages.push(messageParts);
  };
  global.fetch = async (url, options) =>
  {
    requestCount += 1;

    const requestBody = JSON.parse(options.body);

    responseFormats.push(requestBody.response_format);

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
                content: requestCount === 1
                  ? "not json"
                  : JSON.stringify(
                  {
                    brief: "Plain retry succeeded.",
                    suggestedPriority: "URGENT",
                    reason: "The retry returned valid JSON.",
                    riskFactors:
                    [
                      "Fever"
                    ]
                  })
              }
            }
          ]
        };
      }
    };
  };

  const result = await aiService.generateTriageBrief(
  {
    symptomsSummary: "chief_complaint: fever",
    ruleBasedPriority: "URGENT"
  });

  assert.equal(requestCount, 2);
  assert.deepEqual(responseFormats,
  [
    {
      type: "json_object"
    },
    undefined
  ]);
  assert.deepEqual(result,
  {
    brief: "Plain retry succeeded.",
    suggestedPriority: "URGENT",
    reason: "The retry returned valid JSON.",
    riskFactors:
    [
      "Fever"
    ]
  });
  assert.deepEqual(warningMessages, []);
});



test("logs one warning only when both AI attempts fail", async () =>
{
  const warningMessages = [];

  process.env.HF_TOKEN = "test-token";
  process.env.HF_MODEL = "openai/gpt-oss-20b";
  console.warn = (...messageParts) =>
  {
    warningMessages.push(messageParts);
  };
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
                content: "not json"
              }
            }
          ]
        };
      }
    };
  };

  await aiService.generateTriageBrief(
  {
    symptomsSummary: "chief_complaint: fever",
    ruleBasedPriority: "URGENT"
  });

  assert.equal(warningMessages.length, 1);
  assert.equal(warningMessages[0][0], "[ai.service] Hugging Face failure");
  assert.equal(warningMessages[0][1].reason, "all AI attempts failed");
});
