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
