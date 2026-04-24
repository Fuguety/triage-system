const { pool } = require("../db/database");

const questions =
{
  q1:
  {
    id: "q1",
    text: "Is the patient unconscious or unresponsive?",
    answers:
    [
      { id: "yes", label: "Yes", next: "END_RESUSCITATION" },
      { id: "no", label: "No", next: "q2" }
    ]
  },
  q2:
  {
    id: "q2",
    text: "Is the patient having serious trouble breathing?",
    answers:
    [
      { id: "yes", label: "Yes", next: "END_EMERGENT" },
      { id: "no", label: "No", next: "q3" }
    ]
  },
  q3:
  {
    id: "q3",
    text: "Does the patient have chest pain or signs of severe injury?",
    answers:
    [
      { id: "yes", label: "Yes", next: "END_URGENT" },
      { id: "no", label: "No", next: "q4" }
    ]
  },
  q4:
  {
    id: "q4",
    text: "Does the patient have moderate pain, fever, or worsening symptoms?",
    answers:
    [
      { id: "yes", label: "Yes", next: "END_LESS_URGENT" },
      { id: "no", label: "No", next: "END_NON_URGENT" }
    ]
  }
};

const priorityMap =
{
  END_RESUSCITATION: "RESUSCITATION",
  END_EMERGENT: "EMERGENT",
  END_URGENT: "URGENT",
  END_LESS_URGENT: "LESS_URGENT",
  END_NON_URGENT: "NON_URGENT"
};



function createError(message, statusCode)
{
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}



function buildSymptomsSummary(existingSummary, question, answer)
{
  const entry = `${question.text} ${answer.label}`;

  if (!existingSummary)
  {
    return entry;
  }

  return `${existingSummary}\n${entry}`;
}



async function startTriage(patientDetails = {})
{
  const fullName = typeof patientDetails.fullName === "string" ? patientDetails.fullName.trim() : "";
  const patientIdentifier = typeof patientDetails.patientId === "string" ? patientDetails.patientId.trim() : "";
  const healthInsurance = typeof patientDetails.healthInsurance === "string" ? patientDetails.healthInsurance.trim() : "";
  const anonymous = !fullName && !patientIdentifier && !healthInsurance;
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
      [patient.id, "q1", "active"]
    );

    await client.query("COMMIT");

    return {
      anonymous,
      fullName,
      patientNumber: Number(patient.patient_number),
      patientId: patientIdentifier,
      healthInsurance,
      sessionId: sessionResult.rows[0].session_id,
      question: questions.q1
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

  const session = sessionResult.rows[0];

  if (!session)
  {
    throw createError("Session not found", 404);
  }

  if (session.status === "completed")
  {
    throw createError("Session already completed", 409);
  }

  const currentQuestion = questions[session.current_question];

  if (!currentQuestion)
  {
    throw createError("Invalid session state", 500);
  }

  const selectedAnswer = currentQuestion.answers.find(answer => answer.id === answerId);

  if (!selectedAnswer)
  {
    throw createError("Invalid answer", 400);
  }

  const symptomsSummary = buildSymptomsSummary(session.symptoms_summary, currentQuestion, selectedAnswer);

  if (selectedAnswer.next.startsWith("END"))
  {
    const priority = priorityMap[selectedAnswer.next];

    await pool.query(
      `UPDATE triage_sessions
      SET priority_level = $1,
        status = $2,
        symptoms_summary = $3,
        completed_at = CURRENT_TIMESTAMP
      WHERE session_id = $4`,
      [priority, "completed", symptomsSummary, sessionId]
    );

    return {
      done: true,
      anonymous: session.anonymous,
      fullName: session.full_name || "",
      healthInsurance: session.health_insurance || "",
      patientId: session.patient_identifier || "",
      patientNumber: Number(session.patient_number),
      sessionId,
      priority
    };
  }

  await pool.query(
    `UPDATE triage_sessions
    SET current_question = $1,
      symptoms_summary = $2
    WHERE session_id = $3`,
    [selectedAnswer.next, symptomsSummary, sessionId]
  );

  return {
    done: false,
    question: questions[selectedAnswer.next]
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
  resetTriageSessions,
  startTriage
};
