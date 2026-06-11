const triageFlow = require("../data/triage");

const ALLOWED_PRIORITIES =
[
  "RESUSCITATION",
  "EMERGENT",
  "URGENT",
  "LESS_URGENT",
  "NON_URGENT"
];

const HUGGING_FACE_CHAT_COMPLETIONS_URL = "https://router.huggingface.co/v1/chat/completions";
const REQUEST_TIMEOUT_MILLISECONDS = 6000;
const DEFAULT_HUGGING_FACE_MODEL = "openai/gpt-oss-20b";

const answerLabels =
{
  adolescent: "13-17 years",
  animal_allergy: "Animal allergy",
  asthma: "Asthma",
  cancer: "Cancer",
  celiac_disease: "Celiac disease",
  chest_pain: "Chest pain",
  child: "0-12 years",
  contrast_dye_allergy: "Contrast dye allergy",
  diabetes: "Diabetes",
  difficulty_breathing: "Breathing difficulty",
  dust_allergy: "Dust allergy",
  elderly: "65+ years",
  epilepsy: "Epilepsy",
  female: "Female",
  fever: "Fever",
  food_allergy: "Food allergy",
  four_to_seven_days: "4-7 days ago",
  general_pain: "Pain",
  gluten_intolerance_sensitivity: "Gluten intolerance / sensitivity",
  heart_disease: "Heart disease",
  hypertension: "Hypertension",
  insect_sting_allergy: "Insect sting allergy",
  latex_allergy: "Latex allergy",
  less_than_one_hour: "Less than 1 hour ago",
  less_than_one_month: "Less than 1 month ago",
  less_than_twelve_weeks: "Less than 12 weeks",
  lung_disease: "Lung disease",
  male: "Male",
  medication_allergy: "Medication allergy",
  middle_adult: "40-64 years",
  mold_allergy: "Mold allergy",
  more_than_one_month: "More than 1 month ago",
  more_than_seven_days: "More than 7 days ago",
  more_than_three_months: "More than 3 months ago",
  neurological_symptoms: "Neurological symptoms",
  no: "No",
  none: "None",
  not_applicable: "Not applicable",
  not_sure: "Not sure",
  one_to_three_days: "1-3 days ago",
  one_to_three_months: "1-3 months ago",
  one_to_twenty_four_hours: "1-24 hours ago",
  other: "Other",
  other_not_sure: "Other / not sure",
  pollen_allergy: "Pollen allergy",
  prefer_not_to_say: "Prefer not to say",
  twelve_to_twenty_seven_weeks: "12-27 weeks",
  trauma_bleeding: "Trauma or bleeding",
  twenty_eight_or_more_weeks: "28+ weeks",
  vomiting_dehydration: "Vomiting or dehydration",
  wheat_allergy: "Wheat allergy",
  yes: "Yes",
  young_adult: "18-39 years"
};



function getSelectedModel()
{
  return process.env.HF_MODEL || DEFAULT_HUGGING_FACE_MODEL;
}



function getSelectedProvider(model)
{
  const providerSeparatorIndex = model.lastIndexOf(":");

  if (providerSeparatorIndex === -1)
  {
    return "auto";
  }

  return model.slice(providerSeparatorIndex + 1) || "auto";
}



function getSelectionDetails()
{
  const model = getSelectedModel();

  return {
    model,
    provider: getSelectedProvider(model)
  };
}



function logAiFailure(reason, details)
{
  console.warn("[ai.service] Hugging Face failure",
  {
    reason,
    ...getSelectionDetails(),
    ...(details || {})
  });
}



function logAiInfo(reason, details)
{
  if (process.env.AI_DEBUG_LOGS !== "true")
  {
    return;
  }

  console.info("[ai.service] Hugging Face info",
  {
    reason,
    ...getSelectionDetails(),
    ...(details || {})
  });
}



function formatIdentifier(identifier)
{
  if (!identifier)
  {
    return "";
  }

  return identifier
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}



function cleanAnswerId(answerId)
{
  if (typeof answerId !== "string")
  {
    return "";
  }

  return answerId.split(" (derived from intake:")[0];
}



function formatAnswer(answerId)
{
  const cleanAnswer = cleanAnswerId(answerId);

  return answerLabels[cleanAnswer] || formatIdentifier(cleanAnswer);
}



function formatAnswerList(answerIds)
{
  if (!answerIds)
  {
    return "Not provided";
  }

  const formattedAnswers = answerIds
    .split(",")
    .map(formatAnswer)
    .filter(Boolean);

  if (formattedAnswers.length === 0)
  {
    return "Not provided";
  }

  return formattedAnswers.join(", ");
}



function buildQuestionTextMap()
{
  const questionTextMap = {};

  triageFlow.globalQuestions.forEach(question =>
  {
    questionTextMap[question.id] = question.text;
  });

  triageFlow.globalRedFlags.forEach(question =>
  {
    questionTextMap[question.id] = question.text;
  });

  Object.values(triageFlow.flows).forEach(flow =>
  {
    Object.entries(flow.nodes).forEach(([questionId, question]) =>
    {
      questionTextMap[questionId] = question.text;
    });
  });

  return questionTextMap;
}



function parseSymptomsSummary(symptomsSummary)
{
  if (!symptomsSummary)
  {
    return [];
  }

  return symptomsSummary.split("\n").map(entry =>
  {
    const separatorIndex = entry.indexOf(": ");

    if (separatorIndex === -1)
    {
      return null;
    }

    return {
      questionId: entry.slice(0, separatorIndex),
      answerId: entry.slice(separatorIndex + 2)
    };
  }).filter(Boolean);
}



function findAnswer(entries, questionId)
{
  const entry = entries.find(summaryEntry => summaryEntry.questionId === questionId);

  return entry ? entry.answerId : "";
}



function buildReadableAnswers(entries)
{
  const questionTextMap = buildQuestionTextMap();

  return entries.map(entry =>
  {
    return {
      question: questionTextMap[entry.questionId] || formatIdentifier(entry.questionId),
      answer: formatAnswerList(entry.answerId)
    };
  });
}



function buildRedFlags(entries)
{
  const questionTextMap = buildQuestionTextMap();
  const intakeQuestionIds =
  [
    "gender",
    "age_group",
    "pregnancy_possible",
    "pregnancy_status",
    "pregnancy_weeks",
    "last_period",
    "allergies",
    "allergy_details",
    "comorbidities",
    "chief_complaint",
    "symptom_onset"
  ];

  return entries
    .filter(entry => !intakeQuestionIds.includes(entry.questionId))
    .map(entry =>
    {
      return `${questionTextMap[entry.questionId] || formatIdentifier(entry.questionId)}: ${formatAnswerList(entry.answerId)}`;
    });
}



function buildReadablePatientContext(symptomsSummary, ruleBasedPriority, patientContext)
{
  const entries = parseSymptomsSummary(symptomsSummary);
  const pregnancyStatus = formatAnswer(findAnswer(entries, "pregnancy_status"));
  const pregnancyDuration = formatAnswer(findAnswer(entries, "pregnancy_weeks"));
  const allergies = findAnswer(entries, "allergy_details") || findAnswer(entries, "allergies");
  const medicalConditions = findAnswer(entries, "comorbidities");

  return {
    gender: formatAnswer(findAnswer(entries, "gender")) || "Not provided",
    age: formatAnswer(findAnswer(entries, "age_group")) || "Not provided",
    pregnancyStatus: pregnancyStatus || "Not provided",
    pregnancyDuration: pregnancyDuration || "",
    allergies: formatAnswerList(allergies),
    medicalConditions: formatAnswerList(medicalConditions),
    mainSymptom: formatAnswer(findAnswer(entries, "chief_complaint")) || "Not provided",
    onsetTime: formatAnswer(findAnswer(entries, "symptom_onset")) || "Not provided",
    redFlags: buildRedFlags(entries),
    ruleBasedPriority: ruleBasedPriority || "Not provided",
    patientContext: patientContext || {},
    readableAnswers: buildReadableAnswers(entries)
  };
}



function getErrorMessage(responseBody)
{
  if (!responseBody || typeof responseBody !== "object")
  {
    return "";
  }

  if (typeof responseBody.error === "string")
  {
    return responseBody.error;
  }

  if (responseBody.error && typeof responseBody.error.message === "string")
  {
    return responseBody.error.message;
  }

  if (typeof responseBody.message === "string")
  {
    return responseBody.message;
  }

  return "";
}



async function readJsonResponse(response)
{
  try
  {
    return await response.json();
  }
  catch (error)
  {
    return {
      failure:
      {
        reason: "invalid response JSON",
        message: error.message
      }
    };
  }
}



function isAllowedPriority(priority)
{
  return ALLOWED_PRIORITIES.includes(priority);
}



function buildFallbackBrief(readableContext)
{
  return [
    `Main symptom: ${readableContext.mainSymptom}.`,
    `Onset: ${readableContext.onsetTime}.`,
    `Allergies: ${readableContext.allergies}.`,
    `Medical conditions: ${readableContext.medicalConditions}.`
  ].join(" ");
}



function buildFallbackResult(readableContext, ruleBasedPriority)
{
  return {
    brief: buildFallbackBrief(readableContext),
    suggestedPriority: isAllowedPriority(ruleBasedPriority) ? ruleBasedPriority : "LESS_URGENT",
    reason: "AI service unavailable. Rule-based priority used.",
    riskFactors: []
  };
}



function buildSystemPrompt()
{
  return [
    "You are a hospital triage decision support assistant.",
    "This is not a diagnosis.",
    "This is triage decision support only and does not replace clinical judgment.",
    "Use the rule-based priority as the primary reference.",
    "Return JSON only.",
    "Do not include markdown.",
    "Do not include extra text."
  ].join(" ");
}



function buildUserPrompt(input)
{
  return JSON.stringify(
  {
    task: "Generate a short clinical decision support summary for staff review.",
    requiredOutput:
    {
      brief: "Short clinical summary based on the patient's answers.",
      suggestedPriority: "One of RESUSCITATION, EMERGENT, URGENT, LESS_URGENT, NON_URGENT.",
      reason: "Short explanation of why this support priority may be appropriate.",
      riskFactors: ["risk factor 1", "risk factor 2"]
    },
    patientContext: input.readableContext
  });
}



function extractJsonText(content)
{
  const trimmedContent = content.trim();

  if (trimmedContent.startsWith("{") && trimmedContent.endsWith("}"))
  {
    return trimmedContent;
  }

  const firstBraceIndex = trimmedContent.indexOf("{");
  const lastBraceIndex = trimmedContent.lastIndexOf("}");

  if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex)
  {
    return trimmedContent;
  }

  return trimmedContent.slice(firstBraceIndex, lastBraceIndex + 1);
}



function parseResponseBody(responseBody)
{
  const content = responseBody
    && responseBody.choices
    && responseBody.choices[0]
    && responseBody.choices[0].message
    && responseBody.choices[0].message.content;

  if (typeof content !== "string")
  {
    return {
      failure:
      {
        reason: "missing AI response content"
      },
      result: null
    };
  }

  try
  {
    return {
      failure: null,
      result: JSON.parse(extractJsonText(content))
    };
  }
  catch (error)
  {
    return {
      failure:
      {
        reason: "invalid AI JSON",
        message: error.message
      },
      result: null
    };
  }
}



function validateAiResult(result)
{
  if (!result || typeof result !== "object")
  {
    return null;
  }

  if (typeof result.brief !== "string")
  {
    return null;
  }

  if (!isAllowedPriority(result.suggestedPriority))
  {
    return null;
  }

  if (typeof result.reason !== "string")
  {
    return null;
  }

  if (!Array.isArray(result.riskFactors))
  {
    return null;
  }

  if (!result.riskFactors.every(riskFactor => typeof riskFactor === "string"))
  {
    return null;
  }

  return {
    brief: result.brief.trim(),
    suggestedPriority: result.suggestedPriority,
    reason: result.reason.trim(),
    riskFactors: result.riskFactors.map(riskFactor => riskFactor.trim()).filter(Boolean)
  };
}



function buildRequestBody(input, useJsonMode)
{
  const requestBody =
  {
    model: getSelectedModel(),
    messages:
    [
      {
        role: "system",
        content: buildSystemPrompt()
      },
      {
        role: "user",
        content: buildUserPrompt(input)
      }
    ],
    temperature: 0.2,
    max_tokens: 350
  };

  if (useJsonMode)
  {
    requestBody.response_format =
    {
      type: "json_object"
    };
  }

  return requestBody;
}



async function requestHuggingFaceBrief(input, useJsonMode)
{
  const abortController = new AbortController();
  const timeout = setTimeout(() =>
  {
    abortController.abort();
  }, REQUEST_TIMEOUT_MILLISECONDS);

  try
  {
    const response = await fetch(HUGGING_FACE_CHAT_COMPLETIONS_URL,
    {
      method: "POST",
      headers:
      {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildRequestBody(input, useJsonMode)),
      signal: abortController.signal
    });

    if (!response.ok)
    {
      const errorBody = await readJsonResponse(response);
      const parsedErrorBody = errorBody && errorBody.failure ? null : errorBody;

      return {
        failure:
      {
          reason: "HTTP error",
          statusCode: response.status,
          message: getErrorMessage(parsedErrorBody) || response.statusText || "No error message returned."
        },
        responseBody: null
      };
    }

    const responseBody = await readJsonResponse(response);

    if (responseBody && responseBody.failure)
    {
      return {
        failure: responseBody.failure,
        responseBody: null
      };
    }

    return {
      failure: null,
      responseBody
    };
  }
  catch (error)
  {
    if (error.name === "AbortError")
    {
      return {
        failure:
      {
          reason: "timeout",
          message: `Request exceeded ${REQUEST_TIMEOUT_MILLISECONDS} ms.`
        },
        responseBody: null
      };
    }

    return {
      failure:
      {
        reason: "request failed",
        message: error.message
      },
      responseBody: null
    };
  }
  finally
  {
    clearTimeout(timeout);
  }
}



function shouldUsePlainPromptFirst()
{
  return getSelectedModel() === "openai/gpt-oss-20b";
}



function buildAttemptPlan()
{
  if (shouldUsePlainPromptFirst())
  {
    return [
      {
        label: "plain prompt",
        useJsonMode: false
      },
      {
        label: "JSON mode",
        useJsonMode: true
      }
    ];
  }

  return [
    {
      label: "JSON mode",
      useJsonMode: true
    },
    {
      label: "plain prompt",
      useJsonMode: false
    }
  ];
}



function buildFailureDetails(failures)
{
  return {
    attempts: failures.map(failure =>
    {
      return {
        mode: failure.mode,
        reason: failure.reason,
        message: failure.message,
        statusCode: failure.statusCode
      };
    })
  };
}



async function requestValidatedAiResult(input, fallbackResult)
{
  const failures = [];
  const attemptPlan = buildAttemptPlan();

  for (const attempt of attemptPlan)
  {
    const response = await requestHuggingFaceBrief(input, attempt.useJsonMode);

    if (response.failure)
    {
      failures.push(
      {
        mode: attempt.label,
        ...response.failure
      });
      logAiInfo(`${attempt.label} failed`, response.failure);

      continue;
    }

    const parsedResponse = parseResponseBody(response.responseBody);
    const validResult = validateAiResult(parsedResponse.result);

    if (validResult)
    {
      return validResult;
    }

    failures.push(
    {
      mode: attempt.label,
      ...(parsedResponse.failure || { reason: "invalid AI result shape" })
    });
    logAiInfo(`${attempt.label} returned invalid AI output`, parsedResponse.failure);
  }

  logAiFailure("all AI attempts failed", buildFailureDetails(failures));

  return fallbackResult;
}



async function generateTriageBrief(input)
{
  const safeInput = input || {};
  const readableContext = buildReadablePatientContext(
    safeInput.symptomsSummary,
    safeInput.ruleBasedPriority,
    safeInput.patientContext
  );
  const fallbackResult = buildFallbackResult(readableContext, safeInput.ruleBasedPriority);

  if (!process.env.HF_TOKEN)
  {
    logAiFailure("missing HF_TOKEN");

    return fallbackResult;
  }

  try
  {
    return requestValidatedAiResult(
    {
      readableContext
    }, fallbackResult);
  }
  catch (error)
  {
    logAiFailure("unexpected error", { message: error.message });

    return fallbackResult;
  }
}



async function testHuggingFaceConnection()
{
  const selectionDetails = getSelectionDetails();

  if (!process.env.HF_TOKEN)
  {
    logAiFailure("missing HF_TOKEN");

    return {
      configured: false,
      model: selectionDetails.model,
      status: "failed",
      message: "HF_TOKEN is not configured."
    };
  }

  const readableContext = buildReadablePatientContext("chief_complaint: fever\nsymptom_onset: one_to_twenty_four_hours", "NON_URGENT", {});
  const firstAttemptUsesJsonMode = !shouldUsePlainPromptFirst();
  const firstAttempt = await requestHuggingFaceBrief(
  {
    readableContext
  }, firstAttemptUsesJsonMode);
  const responseBody = firstAttempt.responseBody || (await requestHuggingFaceBrief(
  {
    readableContext
  }, !firstAttemptUsesJsonMode)).responseBody;

  if (!responseBody)
  {
    return {
      configured: true,
      model: selectionDetails.model,
      status: "failed",
      message: "Hugging Face request failed. Check server logs for status and error details."
    };
  }

  return {
    configured: true,
    model: selectionDetails.model,
    status: "ok",
    message: "Hugging Face responded successfully."
  };
}



module.exports =
{
  generateTriageBrief,
  testHuggingFaceConnection
};
