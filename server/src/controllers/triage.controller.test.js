const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../db/database");
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



test("returns 400 when sessionId is missing", async () =>
{
  const response = createResponse();

  await triageController.answerQuestion(
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

test("accepts optional intake details on start", async () =>
{
  const response = createResponse();

  await triageController.startTriage(
  {
    body:
    {
      fullName: "Ana Garcia",
      patientId: "123456",
      healthInsurance: "AOK"
    }
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.patientNumber, 1000);
  assert.equal(response.payload.fullName, "Ana Garcia");
  assert.equal(response.payload.anonymous, false);
});

test("returns 400 when fullName is not a string", async () =>
{
  const response = createResponse();

  await triageController.startTriage(
  {
    body:
    {
      fullName: 123
    }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload,
  {
    error: "fullName must be a string"
  });
});

test("returns 400 when patientId is not a string", async () =>
{
  const response = createResponse();

  await triageController.startTriage(
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

test("returns 400 when answerId is missing", async () =>
{
  const response = createResponse();

  await triageController.answerQuestion(
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

test("returns queue data from the controller", async () =>
{
  const session = await triageService.startTriage();
  const result = await triageService.answerQuestion(session.sessionId, "yes");

  await queueService.enqueuePatient(session.sessionId, "RESUSCITATION",
  {
    anonymous: true,
    healthInsurance: "",
    patientId: "",
    patientNumber: result.patientNumber
  });

  const response = createResponse();

  await triageController.getQueue({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.patients.length, 1);
  assert.equal(response.payload.patients[0].priority, "RESUSCITATION");
  assert.equal(response.payload.patients[0].patientNumber, 1000);
});
