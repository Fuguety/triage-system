const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../db/database");
const queueService = require("./queue.service");
const triageService = require("./triage.service");

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



async function createCompletedSession(priority)
{
  const session = await triageService.startTriage();

  await queueService.enqueuePatient(session.sessionId, priority);

  return session;
}



test("orders patients by priority", async () =>
{
  const low = await createCompletedSession("NON_URGENT");
  const high = await createCompletedSession("EMERGENT");
  const mid = await createCompletedSession("URGENT");

  const queue = await queueService.getQueue();

  assert.deepEqual(queue.map(entry => entry.sessionId),
  [
    high.sessionId,
    mid.sessionId,
    low.sessionId
  ]);
});




test("keeps first come first served inside the same priority", async () =>
{
  const first = await createCompletedSession("LESS_URGENT");
  const second = await createCompletedSession("LESS_URGENT");

  const queue = await queueService.getQueue();

  assert.equal(queue[0].sessionId, first.sessionId);
  assert.equal(queue[1].sessionId, second.sessionId);
});




test("returns the correct queue position for a new patient", async () =>
{
  await createCompletedSession("NON_URGENT");
  await createCompletedSession("URGENT");
  const patient = await triageService.startTriage();

  const result = await queueService.enqueuePatient(patient.sessionId, "EMERGENT");

  assert.equal(result.queuePosition, 1);
});




test("updates patient details and sitrep", async () =>
{
  const patient = await createCompletedSession("URGENT");

  const updatedPatient = await queueService.updatePatient(patient.sessionId,
  {
    fullName: "Ana Garcia",
    patientId: "ID-77",
    healthInsurance: "AOK",
    aboutDetails: "Patient waiting for examination"
  });

  assert.equal(updatedPatient.fullName, "Ana Garcia");
  assert.equal(updatedPatient.patientId, "ID-77");
  assert.equal(updatedPatient.healthInsurance, "AOK");
  assert.equal(updatedPatient.aboutDetails, "Patient waiting for examination");
});




test("returns gender and pregnancy details for staff review", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "female");
  await triageService.answerQuestion(session.sessionId, "young_adult");
  await triageService.answerQuestion(session.sessionId, "yes");
  await triageService.answerQuestion(session.sessionId, "twelve_to_twenty_seven_weeks");
  await queueService.enqueuePatient(session.sessionId, "URGENT");

  const patient = await queueService.getPatient(session.sessionId);

  assert.equal(patient.gender, "Female");
  assert.equal(patient.age, "18\u201339 years");
  assert.equal(patient.pregnancyStatus, "Yes");
  assert.equal(patient.pregnancyDetails, "12\u201327 weeks");
});



test("returns allergy and condition details for staff review", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "other");
  await triageService.answerQuestion(session.sessionId, "young_adult");
  await triageService.answerQuestion(session.sessionId, "no");
  await triageService.answerQuestion(session.sessionId, "yes");
  await triageService.answerQuestion(session.sessionId, ["wheat_allergy", "dust_allergy"]);
  await triageService.answerQuestion(session.sessionId, ["celiac_disease", "gluten_intolerance_sensitivity"]);
  await queueService.enqueuePatient(session.sessionId, "URGENT");

  const patient = await queueService.getPatient(session.sessionId);

  assert.equal(patient.allergies, "Wheat allergy, Dust allergy");
  assert.equal(patient.medicalConditions, "Celiac disease, Gluten intolerance / sensitivity");
});



test("updates priority without changing assessing status", async () =>
{
  const patient = await createCompletedSession("NON_URGENT");

  await queueService.startAssessing(patient.sessionId);

  const updatedPatient = await queueService.updatePatient(patient.sessionId,
  {
    priorityLevel: "EMERGENT"
  });

  assert.equal(updatedPatient.priority, "EMERGENT");
  assert.equal(updatedPatient.previousPriority, "NON_URGENT");
  assert.equal(updatedPatient.priorityChanged, true);
  assert.equal(updatedPatient.status, "assessing");
});




test("updates active queue ordering after priority changes", async () =>
{
  const first = await createCompletedSession("URGENT");
  const second = await createCompletedSession("NON_URGENT");

  await queueService.updatePatient(second.sessionId,
  {
    priorityLevel: "RESUSCITATION"
  });

  const queue = await queueService.getQueue();

  assert.deepEqual(queue.map(entry => entry.sessionId),
  [
    second.sessionId,
    first.sessionId
  ]);
});




test("removes completed patients from the active queue", async () =>
{
  const patient = await createCompletedSession("URGENT");

  await queueService.resolvePatient(patient.sessionId, "completed");

  const queue = await queueService.getQueue();

  assert.equal(queue.length, 0);
});




test("marks patient as assessing", async () =>
{
  const session = await createCompletedSession("URGENT");

  const patient = await queueService.startAssessing(session.sessionId);

  assert.equal(patient.status, "assessing");
});
