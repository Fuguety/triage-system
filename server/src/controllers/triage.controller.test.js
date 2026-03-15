const test = require("node:test");
const assert = require("node:assert/strict");

const queueService = require("../services/queue.service");
const triageService = require("../services/triage.service");
const triageController = require("./triage.controller");

function createResponse()
{
  return {
    statusCode: 200,
    payload: null,
    status(code)
    {
      this.statusCode = code;

      return this;
    },
    json(payload)
    {
      this.payload = payload;

      return payload;
    }
  };
}

test.beforeEach(() =>
{
  queueService.resetQueue();
  triageService.resetTriageSessions();
});

test("returns 400 when sessionId is missing", () =>
{
  const response = createResponse();

  triageController.answerQuestion(
  {
    body:
    {
      answerId: "yes"
    }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload,
  {
    error: "sessionId is required"
  });
});

test("returns 400 when answerId is missing", () =>
{
  const response = createResponse();

  triageController.answerQuestion(
  {
    body:
    {
      sessionId: "abc"
    }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload,
  {
    error: "answerId is required"
  });
});

test("returns queue data from the controller", () =>
{
  const session = triageService.startTriage();

  triageService.answerQuestion(session.sessionId, "yes");
  queueService.enqueuePatient(session.sessionId, "RESUSCITATION");

  const response = createResponse();

  triageController.getQueue({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.patients.length, 1);
  assert.equal(response.payload.patients[0].priority, "RESUSCITATION");
});
