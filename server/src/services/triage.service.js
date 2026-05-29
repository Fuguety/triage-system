const { pool } = require("../db/database");
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

  return matchingEntry.slice(questionId.length + 2);
}



function removeLastSummaryEntry(symptomsSummary)
{
  if (!symptomsSummary)
  {
    return null;
  }

  const entries = symptomsSummary.split("\n");

  entries.pop();

  return entries.length ? entries.join("\n") : null;
}



function getLastAnsweredQuestionId(symptomsSummary)
{
  if (!symptomsSummary)
  {
    return null;
  }

  const entries = symptomsSummary.split("\n");
  const lastEntry = entries[entries.length - 1];

  return lastEntry ? lastEntry.split(": ")[0] : null;
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



function getNextGlobalQuestionId(questionRecord, symptomsSummary)
{
  if (questionRecord.rawQuestion.nextByAnswer)
  {
    return questionRecord.rawQuestion.nextByAnswer[findAnswerInSummary(symptomsSummary, questionRecord.rawQuestion.id)];
  }

  if (questionRecord.rawQuestion.nextBySummary)
  {
    const summaryRule = questionRecord.rawQuestion.nextBySummary;
    const summaryAnswer = findAnswerInSummary(symptomsSummary, summaryRule.questionId);

    return summaryRule.answers[summaryAnswer] || summaryRule.default;
  }

  if (questionRecord.rawQuestion.next)
  {
    return questionRecord.rawQuestion.next;
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
    return `END_${questionRecord.rawQuestion.yesPriority}`;
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
  return questionRecord.rawQuestion[answerId];
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



function getTerminalPriority(questionId)
{
  const terminalNode = triageFlow.terminalNodes[questionId];

  return terminalNode ? terminalNode.priority : null;
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
  await pool.query(
    `UPDATE triage_sessions
    SET priority_level = $1,
      status = $2,
      symptoms_summary = $3,
      completed_at = CURRENT_TIMESTAMP
    WHERE session_id = $4`,
    [priority, "completed", symptomsSummary, session.session_id]
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
  const priority = getTerminalPriority(nextQuestionId);

  if (priority)
  {
    return completeSession(session, priority, symptomsSummary);
  }

  return moveToQuestion(sessionId, nextQuestionId, symptomsSummary);
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
