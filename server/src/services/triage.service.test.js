const test = require("node:test");
const assert = require("node:assert/strict");

const triageService = require("./triage.service");

test.beforeEach(() =>
{
  triageService.resetTriageSessions();
});

test("starts triage with the first question", () =>
{
  const result = triageService.startTriage();

  assert.ok(result.sessionId);
  assert.equal(result.patientNumber, 1000);
  assert.equal(result.anonymous, true);
  assert.equal(result.question.id, "q1");
});

test("keeps optional intake details and marks identified patients as non-anonymous", () =>
{
  const result = triageService.startTriage(
  {
    patientId: "ABC123",
    healthInsurance: "TK"
  });

  assert.equal(result.patientNumber, 1000);
  assert.equal(result.anonymous, false);
});

test("progresses to the next question for a non-terminal answer", () =>
{
  const session = triageService.startTriage();

  const result = triageService.answerQuestion(session.sessionId, "no");

  assert.equal(result.done, false);
  assert.equal(result.question.id, "q2");
});

test("returns a five-level priority when triage ends", () =>
{
  const session = triageService.startTriage();

  triageService.answerQuestion(session.sessionId, "no");
  triageService.answerQuestion(session.sessionId, "no");
  triageService.answerQuestion(session.sessionId, "no");

  const result = triageService.answerQuestion(session.sessionId, "yes");

  assert.equal(result.done, true);
  assert.equal(result.priority, "LESS_URGENT");
});

test("rejects invalid answers", () =>
{
  const session = triageService.startTriage();

  assert.throws(() =>
  {
    triageService.answerQuestion(session.sessionId, "maybe");
  },
  {
    message: "Invalid answer"
  });
});
