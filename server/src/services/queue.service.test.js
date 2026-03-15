const test = require("node:test");
const assert = require("node:assert/strict");

const queueService = require("./queue.service");

test.beforeEach(() =>
{
  queueService.resetQueue();
});

test("orders patients by priority", () =>
{
  queueService.enqueuePatient("patient-low", "NON_URGENT");
  queueService.enqueuePatient("patient-high", "EMERGENT");
  queueService.enqueuePatient("patient-mid", "URGENT");

  const queue = queueService.getQueue();

  assert.deepEqual(queue.map(entry => entry.sessionId),
  [
    "patient-high",
    "patient-mid",
    "patient-low"
  ]);
});

test("keeps first come first served inside the same priority", () =>
{
  queueService.enqueuePatient("patient-1", "LESS_URGENT");
  queueService.enqueuePatient("patient-2", "LESS_URGENT");

  const queue = queueService.getQueue();

  assert.equal(queue[0].sessionId, "patient-1");
  assert.equal(queue[1].sessionId, "patient-2");
});

test("returns the correct queue position for a new patient", () =>
{
  queueService.enqueuePatient("patient-1", "NON_URGENT");
  queueService.enqueuePatient("patient-2", "URGENT");

  const result = queueService.enqueuePatient("patient-3", "EMERGENT");

  assert.equal(result.queuePosition, 1);
});
