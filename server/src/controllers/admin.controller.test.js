const test = require("node:test");
const assert = require("node:assert/strict");

const adminController = require("./admin.controller");
const auditService = require("../services/audit.service");
const db = require("../db/database");
const queueService = require("../services/queue.service");
const triageService = require("../services/triage.service");



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



async function createQueuedPatient(priority)
{
  const session = await triageService.startTriage();

  await queueService.enqueuePatient(session.sessionId, priority);

  return session;
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



test("records audit log when priority is adjusted", async () =>
{
  const patient = await createQueuedPatient("URGENT");
  const response = createResponse();

  await queueService.startAssessing(patient.sessionId);

  await adminController.updateQueuePatient(
  {
    body:
    {
      priority_level: "EMERGENT"
    },
    params:
    {
      sessionId: patient.sessionId
    },
    user:
    {
      hospitalName: "Debug Hospital",
      role: "admin"
    }
  }, response);

  const auditLog = await auditService.getAuditLog();
  const priorityAuditEntry = auditLog.find(entry => entry.action === "priority_adjusted");

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.priority, "EMERGENT");
  assert.equal(response.payload.status, "assessing");
  assert.ok(priorityAuditEntry);
  assert.deepEqual(priorityAuditEntry.details,
  {
    previousPriority: "URGENT",
    newPriority: "EMERGENT"
  });
});
