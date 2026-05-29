const { pool } = require("../db/database");

const PRIORITY_LEVELS =
[
  "RESUSCITATION",
  "EMERGENT",
  "URGENT",
  "LESS_URGENT",
  "NON_URGENT"
];

const PUBLIC_QUEUE_STATUSES = ["waiting"];

const ACTIVE_STATUSES = ["waiting", "assessing"];

const priorityOrderSql = `
  CASE queue.priority_level
    WHEN 'RESUSCITATION' THEN 1
    WHEN 'EMERGENT' THEN 2
    WHEN 'URGENT' THEN 3
    WHEN 'LESS_URGENT' THEN 4
    WHEN 'NON_URGENT' THEN 5
    ELSE 6
  END`;

const summaryAnswerLabels =
{
  female: "Female",
  four_to_seven_days: "4\u20137 days ago",
  animal_allergy: "Animal allergy",
  asthma: "Asthma",
  cancer: "Cancer",
  celiac_disease: "Celiac disease",
  contrast_dye_allergy: "Contrast dye allergy",
  diabetes: "Diabetes",
  dust_allergy: "Dust allergy",
  epilepsy: "Epilepsy",
  food_allergy: "Food allergy",
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
  mold_allergy: "Mold allergy",
  more_than_one_month: "More than 1 month ago",
  more_than_seven_days: "More than 7 days ago",
  more_than_three_months: "More than 3 months ago",
  no: "No",
  none: "None",
  not_applicable: "Not applicable",
  not_sure: "Not sure",
  one_to_three_months: "1\u20133 months ago",
  one_to_three_days: "1\u20133 days ago",
  one_to_twenty_four_hours: "1\u201324 hours ago",
  other: "Other",
  pollen_allergy: "Pollen allergy",
  prefer_not_to_say: "Prefer not to say",
  twelve_to_twenty_seven_weeks: "12\u201327 weeks",
  twenty_eight_or_more_weeks: "28+ weeks",
  wheat_allergy: "Wheat allergy",
  yes: "Yes"
};



function createError(message, statusCode)
{
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}



function findSummaryAnswer(symptomsSummary, questionId)
{
  if (!symptomsSummary)
  {
    return "";
  }

  const entries = symptomsSummary.split("\n");
  const matchingEntry = entries.find(entry => entry.startsWith(`${questionId}: `));

  if (!matchingEntry)
  {
    return "";
  }

  return matchingEntry.slice(questionId.length + 2);
}



function formatSummaryAnswer(answerId)
{
  return summaryAnswerLabels[answerId] || "";
}



function formatSummaryAnswerList(answerIds)
{
  if (!answerIds)
  {
    return "Not provided";
  }

  const formattedAnswers = answerIds
    .split(",")
    .map(answerId => formatSummaryAnswer(answerId))
    .filter(Boolean);

  if (formattedAnswers.length === 0)
  {
    return "Not provided";
  }

  if (formattedAnswers.length === 1 && formattedAnswers[0] === "None")
  {
    return "None";
  }

  return formattedAnswers.join(", ");
}



function getPregnancyDetails(symptomsSummary)
{
  const pregnancyStatus = findSummaryAnswer(symptomsSummary, "pregnancy_status");

  if (pregnancyStatus === "yes")
  {
    return formatSummaryAnswer(findSummaryAnswer(symptomsSummary, "pregnancy_weeks")) || "Not sure";
  }

  return "";
}



function validatePriority(priority)
{
  if (!PRIORITY_LEVELS.includes(priority))
  {
    throw createError("Invalid priority level", 400);
  }
}



function serializeEntry(row, queuePosition)
{
  const symptomsSummary = row.symptoms_summary || "";

  return {
    anonymous: row.anonymous,
    fullName: row.full_name || "",
    gender: formatSummaryAnswer(findSummaryAnswer(symptomsSummary, "gender")),
    healthInsurance: row.health_insurance || "",
    patientId: row.patient_identifier || "",
    sessionId: row.session_id,
    priority: row.priority_level,
    patientNumber: Number(row.patient_number),
    aboutDetails: row.about_details || "",
    allergies: formatSummaryAnswerList(findSummaryAnswer(symptomsSummary, "allergy_details") || findSummaryAnswer(symptomsSummary, "allergies")),
    lastPeriod: formatSummaryAnswer(findSummaryAnswer(symptomsSummary, "last_period")),
    medicalConditions: formatSummaryAnswerList(findSummaryAnswer(symptomsSummary, "comorbidities")),
    pregnancyDetails: getPregnancyDetails(symptomsSummary),
    pregnancyStatus: formatSummaryAnswer(findSummaryAnswer(symptomsSummary, "pregnancy_status")),
    status: row.status,
    queuedAt: row.created_at,
    queuePosition
  };
}



async function findQueueRow(sessionId)
{
  const result = await pool.query(
    `SELECT
      queue.created_at,
      queue.status,
      queue.about_details,
      queue.priority_level,
      patients.anonymous,
      patients.full_name,
      patients.health_insurance,
      patients.patient_identifier,
      patients.patient_number,
      triage_sessions.session_id,
      triage_sessions.symptoms_summary
    FROM queue
    JOIN triage_sessions ON triage_sessions.id = queue.triage_session_id
    JOIN patients ON patients.id = triage_sessions.patient_id
    WHERE triage_sessions.session_id = $1`,
    [sessionId]
  );

  return result.rows[0] || null;
}



async function getActiveQueuePosition(sessionId)
{
  const result = await pool.query(
    `SELECT queue_data.queue_position
    FROM
    (
      SELECT
        triage_sessions.session_id,
        ROW_NUMBER() OVER (ORDER BY ${priorityOrderSql}, queue.created_at ASC) AS queue_position
      FROM queue
      JOIN triage_sessions ON triage_sessions.id = queue.triage_session_id
      WHERE queue.status = ANY($1)
    ) AS queue_data
    WHERE queue_data.session_id = $2`,
    [ACTIVE_STATUSES, sessionId]
  );

  return result.rows[0] ? Number(result.rows[0].queue_position) : null;
}



async function enqueuePatient(sessionId, priority)
{
  validatePriority(priority);

  const client = await pool.connect();

  try
  {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      "SELECT id, patient_id FROM triage_sessions WHERE session_id = $1",
      [sessionId]
    );

    if (!sessionResult.rows[0])
    {
      throw createError("Session not found", 404);
    }

    await client.query(
      `UPDATE triage_sessions
      SET priority_level = $1,
        status = $2,
        completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
      WHERE session_id = $3`,
      [priority, "completed", sessionId]
    );

    const queueResult = await client.query(
      `SELECT id
      FROM queue
      WHERE triage_session_id = $1`,
      [sessionResult.rows[0].id]
    );

    if (queueResult.rows[0])
    {
      await client.query(
        `UPDATE queue
        SET priority_level = $1,
          status = $2
        WHERE triage_session_id = $3`,
        [priority, "waiting", sessionResult.rows[0].id]
      );
    }
    else
    {
      await client.query(
        `INSERT INTO queue
        (triage_session_id, priority_level, status)
        VALUES ($1, $2, $3)`,
        [sessionResult.rows[0].id, priority, "waiting"]
      );
    }

    await client.query("COMMIT");
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

  const entry = await getPatient(sessionId);

  return {
    entry,
    queuePosition: entry.queuePosition
  };
}



async function getQueue()
{
  const result = await pool.query(
    `SELECT
      queue.created_at,
      queue.status,
      queue.about_details,
      queue.priority_level,
      patients.anonymous,
      patients.full_name,
      patients.health_insurance,
      patients.patient_identifier,
      patients.patient_number,
      triage_sessions.session_id,
      triage_sessions.symptoms_summary,
      ROW_NUMBER() OVER (ORDER BY ${priorityOrderSql}, queue.created_at ASC) AS queue_position
    FROM queue
    JOIN triage_sessions ON triage_sessions.id = queue.triage_session_id
    JOIN patients ON patients.id = triage_sessions.patient_id
    WHERE queue.status = ANY($1)
    ORDER BY ${priorityOrderSql}, queue.created_at ASC`,
    [PUBLIC_QUEUE_STATUSES]
  );

  return result.rows.map(row => serializeEntry(row, Number(row.queue_position)));
}



async function getAdminQueue()
{
  const activeResult = await pool.query(
    `SELECT
      queue.created_at,
      queue.status,
      queue.about_details,
      queue.priority_level,
      patients.anonymous,
      patients.full_name,
      patients.health_insurance,
      patients.patient_identifier,
      patients.patient_number,
      triage_sessions.session_id,
      triage_sessions.symptoms_summary,
      ROW_NUMBER() OVER (ORDER BY ${priorityOrderSql}, queue.created_at ASC) AS queue_position
    FROM queue
    JOIN triage_sessions ON triage_sessions.id = queue.triage_session_id
    JOIN patients ON patients.id = triage_sessions.patient_id
    WHERE queue.status = ANY($1)
    ORDER BY ${priorityOrderSql}, queue.created_at ASC`,
    [ACTIVE_STATUSES]
  );

  const resolvedResult = await pool.query(
    `SELECT
      queue.created_at,
      queue.status,
      queue.about_details,
      queue.priority_level,
      patients.anonymous,
      patients.full_name,
      patients.health_insurance,
      patients.patient_identifier,
      patients.patient_number,
      triage_sessions.session_id,
      triage_sessions.symptoms_summary
    FROM queue
    JOIN triage_sessions ON triage_sessions.id = queue.triage_session_id
    JOIN patients ON patients.id = triage_sessions.patient_id
    WHERE queue.status <> ALL($1)
    ORDER BY queue.created_at DESC`,
    [ACTIVE_STATUSES]
  );

  const activeEntries = activeResult.rows.map(row => serializeEntry(row, Number(row.queue_position)));
  const resolvedEntries = resolvedResult.rows.map(row => serializeEntry(row, null));

  return [...activeEntries, ...resolvedEntries];
}



async function updatePatient(sessionId, updates)
{
  const row = await findQueueRow(sessionId);

  if (!row)
  {
    throw createError("Queue entry not found", 404);
  }

  const fullName = updates.fullName !== undefined ? updates.fullName.trim() : row.full_name;
  const patientIdentifier = updates.patientId !== undefined ? updates.patientId.trim() : row.patient_identifier;
  const healthInsurance = updates.healthInsurance !== undefined ? updates.healthInsurance.trim() : row.health_insurance;
  const aboutDetails = updates.aboutDetails !== undefined ? updates.aboutDetails.trim() : row.about_details;
  const priorityLevel = updates.priorityLevel !== undefined ? updates.priorityLevel : row.priority_level;
  const anonymous = !fullName && !patientIdentifier && !healthInsurance;
  const priorityChanged = priorityLevel !== row.priority_level;

  validatePriority(priorityLevel);

  await pool.query(
    `UPDATE patients
    SET full_name = $1,
      patient_identifier = $2,
      health_insurance = $3,
      anonymous = $4
    WHERE id =
    (
      SELECT patient_id
      FROM triage_sessions
      WHERE session_id = $5
    )`,
    [fullName || null, patientIdentifier || null, healthInsurance || null, anonymous, sessionId]
  );

  await pool.query(
    `UPDATE queue
    SET about_details = $1,
      priority_level = $2
    WHERE triage_session_id =
    (
      SELECT id
      FROM triage_sessions
      WHERE session_id = $3
    )`,
    [aboutDetails || null, priorityLevel, sessionId]
  );

  await pool.query(
    `UPDATE triage_sessions
    SET priority_level = $1
    WHERE session_id = $2`,
    [priorityLevel, sessionId]
  );

  const updatedPatient = await getPatient(sessionId);

  return {
    ...updatedPatient,
    previousPriority: row.priority_level,
    priorityChanged
  };
}



async function getPatient(sessionId)
{
  const row = await findQueueRow(sessionId);

  if (!row)
  {
    throw createError("Queue entry not found", 404);
  }

  const queuePosition = await getActiveQueuePosition(sessionId);

  return serializeEntry(row, queuePosition);
}



async function resolvePatient(sessionId, status)
{
  const row = await findQueueRow(sessionId);

  if (!row)
  {
    throw createError("Queue entry not found", 404);
  }

  await pool.query(
    `UPDATE queue
    SET status = $1
    WHERE triage_session_id =
    (
      SELECT id
      FROM triage_sessions
      WHERE session_id = $2
    )`,
    [status, sessionId]
  );

  await pool.query(
    `UPDATE triage_sessions
    SET status = $1
    WHERE session_id = $2`,
    [status === "completed" ? "completed" : "cancelled", sessionId]
  );

  return getPatient(sessionId);
}



async function startAssessing(sessionId)
{
  const row = await findQueueRow(sessionId);

  if (!row)
  {
    throw createError("Queue entry not found", 404);
  }

  await pool.query(
    `UPDATE queue
    SET status = $1
    WHERE triage_session_id =
    (
      SELECT id
      FROM triage_sessions
      WHERE session_id = $2
    )`,
    ["assessing", sessionId]
  );

  return getPatient(sessionId);
}



function getPriorityLevels()
{
  return [...PRIORITY_LEVELS];
}



async function resetQueue()
{
  await pool.query("DELETE FROM queue");
}



module.exports =
{
  ACTIVE_STATUSES,
  PUBLIC_QUEUE_STATUSES,
  enqueuePatient,
  getAdminQueue,
  getPatient,
  getPriorityLevels,
  getQueue,
  resolvePatient,
  resetQueue,
  startAssessing,
  updatePatient
};
