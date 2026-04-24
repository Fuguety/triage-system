const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../db/database");
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



test("starts triage with the first question", async () =>
{
  const result = await triageService.startTriage();

  assert.ok(result.sessionId);
  assert.equal(result.patientNumber, 1000);
  assert.equal(result.anonymous, true);
  assert.equal(result.question.id, "q1");
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

test("progresses to the next question for a non-terminal answer", async () =>
{
  const session = await triageService.startTriage();

  const result = await triageService.answerQuestion(session.sessionId, "no");

  assert.equal(result.done, false);
  assert.equal(result.question.id, "q2");
});

test("returns a five-level priority when triage ends", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "no");
  await triageService.answerQuestion(session.sessionId, "no");
  await triageService.answerQuestion(session.sessionId, "no");

  const result = await triageService.answerQuestion(session.sessionId, "yes");

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
