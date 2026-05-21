const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../db/database");
const triageService = require("./triage.service");



async function answerIntakeQuestions(sessionId, chiefComplaint)
{
  await triageService.answerQuestion(sessionId, "young_adult");
  await triageService.answerQuestion(sessionId, chiefComplaint);
  await triageService.answerQuestion(sessionId, "yes");
  await triageService.answerQuestion(sessionId, "none");

  return triageService.answerQuestion(sessionId, "no");
}



async function answerNoToRedFlags(sessionId)
{
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");

  return triageService.answerQuestion(sessionId, "no");
}



test.before(async () =>
{
  await db.initializeDatabase();
});



test.beforeEach(async () =>
{
  await triageService.resetTriageSessions();
});



test.after(async () =>
{
  await db.closeDatabase();
});



test("starts triage with the first global question", async () =>
{
  const result = await triageService.startTriage();

  assert.ok(result.sessionId);
  assert.equal(result.patientNumber, 1000);
  assert.equal(result.anonymous, true);
  assert.equal(result.question.id, "age_group");
  assert.equal(result.question.text, "How old are you?");
  assert.deepEqual(result.question.answers,
  [
    { id: "child", label: "0–12 years" },
    { id: "adolescent", label: "13–17 years" },
    { id: "young_adult", label: "18–39 years" },
    { id: "middle_adult", label: "40–64 years" },
    { id: "elderly", label: "65+ years" }
  ]);
});



test("keeps optional intake details and marks identified patients as non-anonymous", async () =>
{
  const result = await triageService.startTriage(
  {
    fullName: "Ana Garcia",
    patientId: "ABC123",
    healthInsurance: "TK"
  });

  assert.equal(result.patientNumber, 1000);
  assert.equal(result.fullName, "Ana Garcia");
  assert.equal(result.anonymous, false);
});



test("progresses through global questions", async () =>
{
  const session = await triageService.startTriage();

  const ageResult = await triageService.answerQuestion(session.sessionId, "young_adult");

  assert.equal(ageResult.done, false);
  assert.equal(ageResult.question.id, "chief_complaint");
  assert.equal(ageResult.question.text, "What is your main symptom?");
  assert.deepEqual(ageResult.question.answers,
  [
    { id: "difficulty_breathing", label: "Breathing difficulty" },
    { id: "chest_pain", label: "Chest pain" },
    { id: "fever", label: "Fever" },
    { id: "neurological_symptoms", label: "Neurological symptoms" },
    { id: "vomiting_dehydration", label: "Vomiting or dehydration" },
    { id: "trauma_bleeding", label: "Trauma or bleeding" },
    { id: "general_pain", label: "Pain" },
    { id: "other_not_sure", label: "Other / not sure" }
  ]);

  const complaintResult = await triageService.answerQuestion(session.sessionId, "chest_pain");

  assert.equal(complaintResult.done, false);
  assert.equal(complaintResult.question.id, "recent_onset");

  const onsetResult = await triageService.answerQuestion(session.sessionId, "yes");

  assert.equal(onsetResult.done, false);
  assert.equal(onsetResult.question.id, "comorbidities");
  assert.deepEqual(onsetResult.question.answers,
  [
    { id: "none", label: "None" },
    { id: "asthma", label: "Asthma" },
    { id: "epilepsy", label: "Epilepsy" },
    { id: "hypertension", label: "Hypertension" },
    { id: "diabetes", label: "Diabetes" },
    { id: "heart_disease", label: "Heart disease" },
    { id: "lung_disease", label: "Lung disease" },
    { id: "cancer", label: "Cancer" },
    { id: "pregnancy", label: "Pregnancy" },
    { id: "other", label: "Other" }
  ]);
});



test("enters the selected complaint flow after global red flags", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "chest_pain");

  const redFlagResult = await answerNoToRedFlags(session.sessionId);

  assert.equal(redFlagResult.done, false);
  assert.equal(redFlagResult.question.id, "chest_1");
});



test("returns a terminal priority from a complaint flow", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "general_pain");
  await answerNoToRedFlags(session.sessionId);
  await triageService.answerQuestion(session.sessionId, "no");
  await triageService.answerQuestion(session.sessionId, "no");
  await triageService.answerQuestion(session.sessionId, "no");

  const result = await triageService.answerQuestion(session.sessionId, "yes");

  assert.equal(result.done, true);
  assert.equal(result.priority, "NON_URGENT");
  assert.equal(result.patientNumber, 1000);
});



test("returns a terminal priority from a global red flag", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "fever");

  const result = await triageService.answerQuestion(session.sessionId, "yes");

  assert.equal(result.done, true);
  assert.equal(result.priority, "RESUSCITATION");
});



test("routes other or unsure symptoms to less urgent after red flags", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "other_not_sure");

  const result = await answerNoToRedFlags(session.sessionId);

  assert.equal(result.done, true);
  assert.equal(result.priority, "LESS_URGENT");
});



test("rejects invalid answers", async () =>
{
  const session = await triageService.startTriage();

  await assert.rejects(
    triageService.answerQuestion(session.sessionId, "maybe"),
  {
    message: "Invalid answer"
  });
});
