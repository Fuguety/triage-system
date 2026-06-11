const { pool } = require("../db/database");
const aiService = require("./ai.service");
const triageFlow = require("../data/triage");

const answerLabels =
{
  adolescent: "13–17 years",
  animal_allergy: "Animal allergy",
  asthma: "Asthma",
  cancer: "Cancer",
  celiac_disease: "Celiac disease",
  chest_pain: "Chest pain",
  child: "0–12 years",
  contrast_dye_allergy: "Contrast dye allergy",
  diabetes: "Diabetes",
  difficulty_breathing: "Breathing difficulty",
  dust_allergy: "Dust allergy",
  elderly: "65+ years",
  epilepsy: "Epilepsy",
  fever: "Fever",
  female: "Female",
  food_allergy: "Food allergy",
  four_to_seven_days: "4\u20137 days ago",
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
  middle_adult: "40–64 years",
  mold_allergy: "Mold allergy",
  more_than_one_month: "More than 1 month ago",
  more_than_seven_days: "More than 7 days ago",
  more_than_three_months: "More than 3 months ago",
  neurological_symptoms: "Neurological symptoms",
  none: "None",
  not_applicable: "Not applicable",
  not_sure: "Not sure",
  one_to_three_days: "1\u20133 days ago",
  one_to_three_months: "1\u20133 months ago",
  one_to_twenty_four_hours: "1\u201324 hours ago",
  other: "Other",
  other_not_sure: "Other / not sure",
  pollen_allergy: "Pollen allergy",
  prefer_not_to_say: "Prefer not to say",
  pregnancy: "Pregnancy",
  twelve_to_twenty_seven_weeks: "12\u201327 weeks",
  twenty_eight_or_more_weeks: "28+ weeks",
  trauma_bleeding: "Trauma or bleeding",
  vomiting_dehydration: "Vomiting or dehydration",
  wheat_allergy: "Wheat allergy",
  young_adult: "18–39 years"
};



function createError(message, statusCode)
{
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}



function formatAnswerLabel(answerId)
{
  if (answerLabels[answerId])
  {
    return answerLabels[answerId];
  }

  return answerId
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}



function buildYesNoAnswers()
{
  return [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" }
  ];
}



function buildChoiceAnswers(options)
{
  return options.map(option =>
  ({
    id: option,
    label: formatAnswerLabel(option)
  }));
}



function buildGlobalQuestion(question)
{
  const questionType = question.type === "multi_select" ? "multi_select" : "single_select";

  if (question.type === "yes_no")
  {
    return {
      id: question.id,
      text: question.text,
      type: questionType,
      answers: buildYesNoAnswers()
    };
  }

  return {
    id: question.id,
    text: question.text,
    type: questionType,
    answers: buildChoiceAnswers(question.options || [])
  };
}



function buildRedFlagQuestion(redFlag)
{
  return {
    id: redFlag.id,
    text: redFlag.text,
    type: "single_select",
    answers: buildYesNoAnswers()
  };
}



function buildFlowQuestion(questionId, node)
{
  return {
    id: questionId,
    text: node.text,
    type: "single_select",
    answers: buildYesNoAnswers()
  };
}



function getFirstGlobalQuestion()
{
  return triageFlow.globalQuestions[0];
}



function findGlobalQuestion(questionId)
{
  const questionIndex = triageFlow.globalQuestions.findIndex(question => question.id === questionId);

  if (questionIndex === -1)
  {
    return null;
  }

  return {
    kind: "global",
    index: questionIndex,
    rawQuestion: triageFlow.globalQuestions[questionIndex],
    question: buildGlobalQuestion(triageFlow.globalQuestions[questionIndex])
  };
}



function findRedFlagQuestion(questionId)
{
  const questionIndex = triageFlow.globalRedFlags.findIndex(question => question.id === questionId);

  if (questionIndex === -1)
  {
    return null;
  }

  return {
    kind: "red_flag",
    index: questionIndex,
    rawQuestion: triageFlow.globalRedFlags[questionIndex],
    question: buildRedFlagQuestion(triageFlow.globalRedFlags[questionIndex])
  };
}



function findFlowQuestion(questionId)
{
  const flowEntries = Object.entries(triageFlow.flows);

  for (const [, flow] of flowEntries)
  {
    if (flow.nodes[questionId])
    {
      return {
        kind: "flow",
        rawQuestion: flow.nodes[questionId],
        question: buildFlowQuestion(questionId, flow.nodes[questionId])
      };
    }
  }

  return null;
}



function findQuestion(questionId)
{
  return findGlobalQuestion(questionId)
    || findRedFlagQuestion(questionId)
    || findFlowQuestion(questionId);
}



function normalizeOutcome(outcome)
{
  if (!outcome)
  {
    return {};
  }

  if (typeof outcome === "string")
  {
    return {
      next: outcome
    };
  }

  return outcome;
}



function cleanAnswerId(answerId)
{
  if (typeof answerId !== "string")
  {
    return answerId;
  }

  return answerId.split(" (derived from intake:")[0];
}



function getGlobalAnswerOutcome(questionRecord, symptomsSummary)
{
  if (questionRecord.rawQuestion.nextByAnswer)
  {
    const currentAnswer = findAnswerInSummary(symptomsSummary, questionRecord.rawQuestion.id);

    return normalizeOutcome(questionRecord.rawQuestion.nextByAnswer[currentAnswer]);
  }

  if (questionRecord.rawQuestion.nextBySummary)
  {
    const summaryRule = questionRecord.rawQuestion.nextBySummary;
    const summaryAnswer = findAnswerInSummary(symptomsSummary, summaryRule.questionId);

    return normalizeOutcome(summaryRule.answers[summaryAnswer] || summaryRule.default);
  }

  if (questionRecord.rawQuestion.next)
  {
    return normalizeOutcome(questionRecord.rawQuestion.next);
  }

  return {};
}



function getAnswerOutcome(questionRecord, answerId, symptomsSummary)
{
  if (questionRecord.kind === "global")
  {
    return getGlobalAnswerOutcome(questionRecord, symptomsSummary);
  }

  if (questionRecord.kind === "red_flag" && answerId === "yes")
  {
    return normalizeOutcome(
    {
      lockedPriority: questionRecord.rawQuestion.lockedPriority,
      next: questionRecord.rawQuestion.next,
      priorityAdjustment: questionRecord.rawQuestion.priorityAdjustment,
      provisionalPriority: questionRecord.rawQuestion.provisionalPriority
    });
  }

  if (questionRecord.kind === "flow")
  {
    return normalizeOutcome(questionRecord.rawQuestion[answerId]);
  }

  return {};
}



function validateAnswer(question, answerId)
{
  if (question.type === "multi_select")
  {
    return validateMultipleAnswers(question, answerId);
  }

  const selectedAnswer = question.answers.find(answer => answer.id === answerId);

  if (!selectedAnswer)
  {
    throw createError("Invalid answer", 400);
  }

  return selectedAnswer;
}



function validateMultipleAnswers(question, answerIds)
{
  if (!Array.isArray(answerIds) || answerIds.length === 0)
  {
    throw createError("Invalid answer", 400);
  }

  const uniqueAnswerIds = [...new Set(answerIds)];
  const selectedAnswers = uniqueAnswerIds.map(answerId =>
  {
    const selectedAnswer = question.answers.find(answer => answer.id === answerId);

    if (!selectedAnswer)
    {
      throw createError("Invalid answer", 400);
    }

    return selectedAnswer;
  });

  if (uniqueAnswerIds.includes("none") && uniqueAnswerIds.length > 1)
  {
    throw createError("Invalid answer", 400);
  }

  return selectedAnswers;
}



function buildSymptomsSummary(existingSummary, question, answer)
{
  const answerValue = Array.isArray(answer)
    ? answer.map(selectedAnswer => selectedAnswer.id).join(",")
    : answer.id;
  const entry = `${question.id}: ${answerValue}`;

  if (!existingSummary)
  {
    return entry;
  }

  return `${existingSummary}\n${entry}`;
}



function buildDerivedSymptomsSummary(existingSummary, questionId, answerId, reason)
{
  const entry = `${questionId}: ${answerId} (derived from intake: ${reason})`;

  if (!existingSummary)
  {
    return entry;
  }

  return `${existingSummary}\n${entry}`;
}



function findAnswerInSummary(symptomsSummary, questionId)
{
  if (!symptomsSummary)
  {
    return null;
  }

  const entries = symptomsSummary.split("\n");
  const matchingEntry = entries.find(entry => entry.startsWith(`${questionId}: `));

  if (!matchingEntry)
  {
    return null;
  }

  return cleanAnswerId(matchingEntry.slice(questionId.length + 2));
}



function findAnswersInSummary(symptomsSummary, questionId)
{
  const answer = findAnswerInSummary(symptomsSummary, questionId);

  if (!answer)
  {
    return [];
  }

  return answer.split(",");
}



function hasSummaryAnswer(symptomsSummary, questionId, answerId)
{
  return findAnswersInSummary(symptomsSummary, questionId).includes(answerId);
}



function isKnownOnset(answer)
{
  return Boolean(answer && answer !== "not_sure");
}



function deriveRiskFlags(symptomsSummary)
{
  const ageGroup = findAnswerInSummary(symptomsSummary, "age_group");
  const pregnancyStatus = findAnswerInSummary(symptomsSummary, "pregnancy_status");
  const pregnancyPossible = findAnswerInSummary(symptomsSummary, "pregnancy_possible");
  const allergyStatus = findAnswerInSummary(symptomsSummary, "allergies");
  const symptomOnset = findAnswerInSummary(symptomsSummary, "symptom_onset");

  return {
    hasAllergies: allergyStatus === "yes" ? true : allergyStatus === "no" ? false : null,
    hasAsthma: hasSummaryAnswer(symptomsSummary, "comorbidities", "asthma"),
    hasCancer: hasSummaryAnswer(symptomsSummary, "comorbidities", "cancer"),
    hasDiabetes: hasSummaryAnswer(symptomsSummary, "comorbidities", "diabetes"),
    hasHeartDisease: hasSummaryAnswer(symptomsSummary, "comorbidities", "heart_disease"),
    hasHypertension: hasSummaryAnswer(symptomsSummary, "comorbidities", "hypertension"),
    hasLungDisease: hasSummaryAnswer(symptomsSummary, "comorbidities", "lung_disease"),
    hasSevereOnset: symptomOnset === "less_than_one_hour" ? true : isKnownOnset(symptomOnset) ? false : null,
    isAdult: ["young_adult", "middle_adult", "elderly"].includes(ageGroup),
    isChild: ["child", "adolescent"].includes(ageGroup),
    isElderly: ageGroup === "elderly",
    isPregnant: pregnancyStatus === "yes",
    onsetMoreThan1Month: symptomOnset === "more_than_one_month" ? true : isKnownOnset(symptomOnset) ? false : null,
    onsetMoreThan24Hours: ["one_to_three_days", "four_to_seven_days", "more_than_seven_days", "more_than_one_month"].includes(symptomOnset) ? true : isKnownOnset(symptomOnset) ? false : null,
    onsetMoreThan7Days: ["more_than_seven_days", "more_than_one_month"].includes(symptomOnset) ? true : isKnownOnset(symptomOnset) ? false : null,
    pregnancyUnknown: pregnancyStatus === "not_sure" || pregnancyPossible === "not_sure"
  };
}



function getRiskFlagLabel(flagName)
{
  const labels =
  {
    hasAllergies: "allergies",
    hasAsthma: "asthma",
    hasCancer: "cancer",
    hasDiabetes: "diabetes",
    hasHeartDisease: "heart disease",
    hasHypertension: "hypertension",
    hasLungDisease: "lung disease",
    hasSevereOnset: "onset less than 1 hour",
    isAdult: "adult age group",
    isChild: "under 18",
    isElderly: "age 65+",
    isPregnant: "pregnancy",
    onsetMoreThan1Month: "onset more than 1 month",
    onsetMoreThan24Hours: "onset more than 24 hours",
    onsetMoreThan7Days: "onset more than 7 days",
    pregnancyUnknown: "pregnancy uncertain"
  };

  return labels[flagName] || formatAnswerLabel(flagName);
}



function evaluateAnyCondition(riskFlags, flagNames)
{
  const values = flagNames.map(flagName => riskFlags[flagName]);

  if (values.includes(true))
  {
    return true;
  }

  if (values.includes(null) || values.includes(undefined))
  {
    return null;
  }

  return false;
}



function evaluateAllCondition(riskFlags, flagNames)
{
  const values = flagNames.map(flagName => riskFlags[flagName]);

  if (values.includes(false))
  {
    return false;
  }

  if (values.includes(null) || values.includes(undefined))
  {
    return null;
  }

  return true;
}



function evaluateDerivedCondition(question, riskFlags)
{
  const flagNames = question.deriveFrom || [];

  if (!question.skipIfKnown || !flagNames.length)
  {
    return null;
  }

  if (question.condition === "all")
  {
    return evaluateAllCondition(riskFlags, flagNames);
  }

  if (question.condition === "any")
  {
    return evaluateAnyCondition(riskFlags, flagNames);
  }

  return riskFlags[question.condition || flagNames[0]];
}



function getDerivedReason(question, riskFlags, conditionResult)
{
  const matchingFlags = (question.deriveFrom || []).filter(flagName => riskFlags[flagName] === conditionResult);

  if (!matchingFlags.length)
  {
    return conditionResult ? "risk factor present" : "risk factor absent";
  }

  return matchingFlags.map(getRiskFlagLabel).join(", ");
}



function getDerivedAnswer(questionRecord, symptomsSummary)
{
  const riskFlags = deriveRiskFlags(symptomsSummary);
  const conditionResult = evaluateDerivedCondition(questionRecord.rawQuestion, riskFlags);

  if (conditionResult === null || conditionResult === undefined)
  {
    return null;
  }

  return {
    answerId: conditionResult ? "yes" : "no",
    reason: getDerivedReason(questionRecord.rawQuestion, riskFlags, conditionResult)
  };
}



function parseSummaryEntries(symptomsSummary)
{
  if (!symptomsSummary)
  {
    return [];
  }

  return symptomsSummary.split("\n").map(entry =>
  {
    const separatorIndex = entry.indexOf(": ");

    return {
      answerId: cleanAnswerId(entry.slice(separatorIndex + 2)),
      questionId: entry.slice(0, separatorIndex)
    };
  });
}



function isDerivedSummaryEntry(entry)
{
  return entry.includes(" (derived from intake:");
}



function removeLastSummaryEntry(symptomsSummary)
{
  if (!symptomsSummary)
  {
    return null;
  }

  const entries = symptomsSummary.split("\n");

  while (entries.length)
  {
    const entry = entries.pop();
    const questionId = entry.split(": ")[0];

    if (!isDerivedSummaryEntry(entry) && findQuestion(questionId))
    {
      break;
    }
  }

  return entries.length ? entries.join("\n") : null;
}



function getLastAnsweredQuestionId(symptomsSummary)
{
  if (!symptomsSummary)
  {
    return null;
  }

  const entries = symptomsSummary.split("\n");

  for (let index = entries.length - 1; index >= 0; index -= 1)
  {
    const entry = entries[index];
    const questionId = entry.split(": ")[0];

    if (!isDerivedSummaryEntry(entry) && findQuestion(questionId))
    {
      return questionId;
    }
  }

  return null;
}



function getFirstRedFlagQuestionId()
{
  if (!triageFlow.globalRedFlags.length)
  {
    return null;
  }

  return triageFlow.globalRedFlags[0].id;
}



function getComplaintStartQuestionId(symptomsSummary)
{
  const chiefComplaint = findAnswerInSummary(symptomsSummary, "chief_complaint");

  if (chiefComplaint === "other_not_sure")
  {
    return "END_LESS_URGENT";
  }

  const flow = triageFlow.flows[chiefComplaint];

  if (!flow)
  {
    throw createError("Invalid complaint flow", 500);
  }

  return flow.start;
}



function getComplaintDefaultPriority(symptomsSummary)
{
  const chiefComplaint = findAnswerInSummary(symptomsSummary, "chief_complaint");
  const flow = triageFlow.flows[chiefComplaint];

  return flow ? flow.defaultPriority : "LESS_URGENT";
}



function applyPriorityOutcome(priorityState, outcome)
{
  if (outcome.lockedPriority)
  {
    return {
      ...priorityState,
      lockedPriority: outcome.lockedPriority
    };
  }

  if (outcome.priorityAdjustment)
  {
    return {
      ...priorityState,
      provisionalPriority: outcome.priorityAdjustment
    };
  }

  if (outcome.provisionalPriority)
  {
    return {
      ...priorityState,
      provisionalPriority: outcome.provisionalPriority
    };
  }

  return priorityState;
}



function getPriorityState(symptomsSummary)
{
  return parseSummaryEntries(symptomsSummary).reduce((priorityState, entry) =>
  {
    const questionRecord = findQuestion(entry.questionId);

    if (!questionRecord)
    {
      return priorityState;
    }

    return applyPriorityOutcome(priorityState, getAnswerOutcome(questionRecord, entry.answerId, symptomsSummary));
  },
  {
    lockedPriority: null,
    provisionalPriority: null
  });
}



function calculateFinalPriority(symptomsSummary, terminalPriority)
{
  const priorityState = getPriorityState(symptomsSummary);

  if (priorityState.lockedPriority)
  {
    return priorityState.lockedPriority;
  }

  return priorityState.provisionalPriority
    || terminalPriority
    || getComplaintDefaultPriority(symptomsSummary);
}



function getNextGlobalQuestionId(questionRecord, symptomsSummary)
{
  const outcome = getGlobalAnswerOutcome(questionRecord, symptomsSummary);

  if (outcome.next)
  {
    return outcome.next;
  }

  const nextQuestion = triageFlow.globalQuestions[questionRecord.index + 1];

  if (nextQuestion)
  {
    return nextQuestion.id;
  }

  return getFirstRedFlagQuestionId() || getComplaintStartQuestionId(symptomsSummary);
}



function getNextRedFlagQuestionId(questionRecord, answerId, symptomsSummary)
{
  if (answerId === "yes")
  {
    const outcome = getAnswerOutcome(questionRecord, answerId, symptomsSummary);

    if (outcome.next)
    {
      return outcome.next;
    }
  }

  const nextQuestion = triageFlow.globalRedFlags[questionRecord.index + 1];

  if (nextQuestion)
  {
    return nextQuestion.id;
  }

  return getComplaintStartQuestionId(symptomsSummary);
}



function getNextFlowQuestionId(questionRecord, answerId)
{
  return getAnswerOutcome(questionRecord, answerId).next;
}



function getNextQuestionId(questionRecord, answerId, symptomsSummary)
{
  if (questionRecord.kind === "global")
  {
    return getNextGlobalQuestionId(questionRecord, symptomsSummary);
  }

  if (questionRecord.kind === "red_flag")
  {
    return getNextRedFlagQuestionId(questionRecord, answerId, symptomsSummary);
  }

  return getNextFlowQuestionId(questionRecord, answerId);
}



function getDerivedOutcome(questionRecord, answerId)
{
  const trueAnswer = answerId === "yes";
  const priority = trueAnswer
    ? questionRecord.rawQuestion.priorityIfTrue
    : questionRecord.rawQuestion.priorityIfFalse;
  const next = trueAnswer
    ? questionRecord.rawQuestion.nextIfTrue
    : questionRecord.rawQuestion.nextIfFalse;
  const answerOutcome = getAnswerOutcome(questionRecord, answerId);

  return {
    ...answerOutcome,
    next: next || answerOutcome.next,
    provisionalPriority: priority || answerOutcome.provisionalPriority
  };
}



function getTerminalPriority(questionId)
{
  const terminalNode = triageFlow.terminalNodes[questionId];

  return terminalNode ? terminalNode.priority || null : null;
}



function isTerminalQuestion(questionId)
{
  return Boolean(triageFlow.terminalNodes[questionId]);
}



function resolveNextStep(questionId, symptomsSummary)
{
  let currentQuestionId = questionId;
  let currentSymptomsSummary = symptomsSummary;
  let skippedQuestionCount = 0;

  while (!isTerminalQuestion(currentQuestionId))
  {
    skippedQuestionCount += 1;

    if (skippedQuestionCount > 50)
    {
      throw createError("Invalid triage flow", 500);
    }

    const questionRecord = findQuestion(currentQuestionId);

    if (!questionRecord)
    {
      throw createError("Invalid session state", 500);
    }

    const derivedAnswer = getDerivedAnswer(questionRecord, currentSymptomsSummary);

    if (!derivedAnswer)
    {
      return {
        done: false,
        questionId: currentQuestionId,
        symptomsSummary: currentSymptomsSummary
      };
    }

    currentSymptomsSummary = buildDerivedSymptomsSummary(
      currentSymptomsSummary,
      questionRecord.question.id,
      derivedAnswer.answerId,
      derivedAnswer.reason
    );

    const derivedOutcome = getDerivedOutcome(questionRecord, derivedAnswer.answerId);

    currentQuestionId = derivedOutcome.next || getNextQuestionId(questionRecord, derivedAnswer.answerId, currentSymptomsSummary);
  }

  return {
    done: true,
    questionId: currentQuestionId,
    symptomsSummary: currentSymptomsSummary
  };
}



async function fetchSession(sessionId)
{
  const sessionResult = await pool.query(
    `SELECT
      triage_sessions.id,
      triage_sessions.session_id,
      triage_sessions.current_question,
      triage_sessions.status,
      triage_sessions.symptoms_summary,
      patients.full_name,
      patients.patient_identifier,
      patients.health_insurance,
      patients.anonymous,
      patients.patient_number
    FROM triage_sessions
    JOIN patients ON patients.id = triage_sessions.patient_id
    WHERE triage_sessions.session_id = $1`,
    [sessionId]
  );

  return sessionResult.rows[0] || null;
}



async function completeSession(session, priority, symptomsSummary)
{
  const aiSummary = await aiService.generateTriageBrief(
  {
    symptomsSummary,
    ruleBasedPriority: priority,
    patientContext:
    {
      anonymous: session.anonymous,
      patientNumber: Number(session.patient_number)
    }
  });

  await pool.query(
    `UPDATE triage_sessions
    SET priority_level = $1,
      status = $2,
      symptoms_summary = $3,
      completed_at = CURRENT_TIMESTAMP,
      ai_brief = $4,
      ai_suggested_priority = $5,
      ai_reason = $6,
      ai_risk_factors = $7
    WHERE session_id = $8`,
    [
      priority,
      "completed",
      symptomsSummary,
      aiSummary.brief,
      aiSummary.suggestedPriority,
      aiSummary.reason,
      JSON.stringify(aiSummary.riskFactors),
      session.session_id
    ]
  );

  return {
    done: true,
    anonymous: session.anonymous,
    fullName: session.full_name || "",
    healthInsurance: session.health_insurance || "",
    patientId: session.patient_identifier || "",
    patientNumber: Number(session.patient_number),
    sessionId: session.session_id,
    priority
  };
}



async function moveToQuestion(sessionId, questionId, symptomsSummary)
{
  await pool.query(
    `UPDATE triage_sessions
    SET current_question = $1,
      symptoms_summary = $2
    WHERE session_id = $3`,
    [questionId, symptomsSummary, sessionId]
  );

  return {
    done: false,
    question: findQuestion(questionId).question
  };
}



async function startTriage(patientDetails = {})
{
  const fullName = typeof patientDetails.fullName === "string" ? patientDetails.fullName.trim() : "";
  const patientIdentifier = typeof patientDetails.patientId === "string" ? patientDetails.patientId.trim() : "";
  const healthInsurance = typeof patientDetails.healthInsurance === "string" ? patientDetails.healthInsurance.trim() : "";
  const anonymous = !fullName && !patientIdentifier && !healthInsurance;
  const firstQuestion = getFirstGlobalQuestion();
  const client = await pool.connect();

  try
  {
    await client.query("BEGIN");

    const patientResult = await client.query(
      `INSERT INTO patients
      (full_name, patient_identifier, health_insurance, anonymous)
      VALUES ($1, $2, $3, $4)
      RETURNING id, patient_number`,
      [fullName || null, patientIdentifier || null, healthInsurance || null, anonymous]
    );

    const patient = patientResult.rows[0];
    const sessionResult = await client.query(
      `INSERT INTO triage_sessions
      (patient_id, current_question, status)
      VALUES ($1, $2, $3)
      RETURNING session_id`,
      [patient.id, firstQuestion.id, "active"]
    );

    await client.query("COMMIT");

    return {
      anonymous,
      fullName,
      patientNumber: Number(patient.patient_number),
      patientId: patientIdentifier,
      healthInsurance,
      sessionId: sessionResult.rows[0].session_id,
      question: buildGlobalQuestion(firstQuestion)
    };
  }
  catch (error)
  {
    await client.query("ROLLBACK");

    throw error;
  }
  finally
  {
    client.release();
  }
}



async function answerQuestion(sessionId, answerId)
{
  const session = await fetchSession(sessionId);

  if (!session)
  {
    throw createError("Session not found", 404);
  }

  if (session.status === "completed")
  {
    throw createError("Session already completed", 409);
  }

  const questionRecord = findQuestion(session.current_question);

  if (!questionRecord)
  {
    throw createError("Invalid session state", 500);
  }

  const selectedAnswer = validateAnswer(questionRecord.question, answerId);
  const symptomsSummary = buildSymptomsSummary(session.symptoms_summary, questionRecord.question, selectedAnswer);
  const nextQuestionId = getNextQuestionId(questionRecord, answerId, symptomsSummary);
  const nextStep = resolveNextStep(nextQuestionId, symptomsSummary);

  if (nextStep.done)
  {
    const priority = calculateFinalPriority(nextStep.symptomsSummary, getTerminalPriority(nextStep.questionId));

    return completeSession(session, priority, nextStep.symptomsSummary);
  }

  return moveToQuestion(sessionId, nextStep.questionId, nextStep.symptomsSummary);
}



async function goBackQuestion(sessionId)
{
  const session = await fetchSession(sessionId);

  if (!session)
  {
    throw createError("Session not found", 404);
  }

  if (session.status === "completed")
  {
    throw createError("Session already completed", 409);
  }

  const previousQuestionId = getLastAnsweredQuestionId(session.symptoms_summary);

  if (!previousQuestionId)
  {
    throw createError("No previous question", 400);
  }

  const previousQuestion = findQuestion(previousQuestionId);

  if (!previousQuestion)
  {
    throw createError("Invalid session state", 500);
  }

  const symptomsSummary = removeLastSummaryEntry(session.symptoms_summary);

  await pool.query(
    `UPDATE triage_sessions
    SET current_question = $1,
      symptoms_summary = $2
    WHERE session_id = $3`,
    [previousQuestionId, symptomsSummary, sessionId]
  );

  return {
    done: false,
    question: previousQuestion.question
  };
}



async function resetTriageSessions()
{
  await pool.query("DELETE FROM queue");
  await pool.query("DELETE FROM audit_logs");
  await pool.query("DELETE FROM triage_sessions");
  await pool.query("DELETE FROM patients");
  await pool.query("ALTER SEQUENCE patient_number_sequence RESTART WITH 1000");
}



module.exports =
{
  answerQuestion,
  goBackQuestion,
  resetTriageSessions,
  startTriage
};
