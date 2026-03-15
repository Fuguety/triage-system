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

test("accepts optional intake details on start", () =>
{
  const response = createResponse();

  triageController.startTriage(
  {
    body:
    {
      patientId: "123456",
      healthInsurance: "AOK"
    }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.patientNumber, 1000);
  assert.equal(response.payload.anonymous, false);
});

test("returns 400 when patientId is not a string", () =>
{
  const response = createResponse();

  triageController.startTriage(
  {
    body:
    {
      patientId: 123
    }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload,
  {
    error: "patientId must be a string"
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
  const result = triageService.answerQuestion(session.sessionId, "yes");

  queueService.enqueuePatient(session.sessionId, "RESUSCITATION",
  {
    anonymous: true,
    healthInsurance: "",
    patientId: "",
    patientNumber: result.patientNumber
  });

  const response = createResponse();

  triageController.getQueue({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.patients.length, 1);
  assert.equal(response.payload.patients[0].priority, "RESUSCITATION");
  assert.equal(response.payload.patients[0].patientNumber, 1000);
});
