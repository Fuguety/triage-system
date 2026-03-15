const PRIORITY_LEVELS =
[
  "RESUSCITATION",
  "EMERGENT",
  "URGENT",
  "LESS_URGENT",
  "NON_URGENT"
];

const priorityRank = PRIORITY_LEVELS.reduce((accumulator, priority, index) =>
{
  accumulator[priority] = index;

  return accumulator;
}, {});

const queue = [];

const PUBLIC_QUEUE_STATUSES = ["waiting"];

const ACTIVE_STATUSES = ["waiting", "assessing"];

let sequence = 0;



function compareEntries(left, right)
{
  const leftRank = priorityRank[left.priority];
  const rightRank = priorityRank[right.priority];

  if (leftRank !== rightRank)
  {
    return leftRank - rightRank;
  }

  return left.sequence - right.sequence;
}



function enqueuePatient(sessionId, priority, metadata = {})
{
  if (!priorityRank.hasOwnProperty(priority))
  {
    throw new Error("Invalid priority level");
  }

  const entry =
  {
    anonymous: Boolean(metadata.anonymous),
    healthInsurance: metadata.healthInsurance || "",
    patientId: metadata.patientId || "",
    sessionId,
    priority,
    patientNumber: metadata.patientNumber || null,
    sequence: sequence++,
    aboutDetails: metadata.aboutDetails || "",
    status: "waiting",
    queuedAt: new Date().toISOString()
  };

  queue.push(entry);
  queue.sort(compareEntries);

  return {
    entry,
    queuePosition: queue.findIndex(item => item.sessionId === sessionId) + 1
  };
}



function getQueue()
{
  return queue
    .filter(entry => PUBLIC_QUEUE_STATUSES.includes(entry.status))
    .map((entry, index) =>
  {
    return {
      anonymous: entry.anonymous,
      healthInsurance: entry.healthInsurance,
      patientId: entry.patientId,
      sessionId: entry.sessionId,
      priority: entry.priority,
      patientNumber: entry.patientNumber,
      queuePosition: index + 1,
      aboutDetails: entry.aboutDetails,
      status: entry.status,
      queuedAt: entry.queuedAt
    };
  });
}



function serializeEntry(entry)
{
  return {
    anonymous: entry.anonymous,
    healthInsurance: entry.healthInsurance,
    patientId: entry.patientId,
    sessionId: entry.sessionId,
    priority: entry.priority,
    patientNumber: entry.patientNumber,
    aboutDetails: entry.aboutDetails,
    status: entry.status,
    queuedAt: entry.queuedAt
  };
}



function getAdminQueue()
{
  const activeEntries = queue
    .filter(entry => ACTIVE_STATUSES.includes(entry.status))
    .sort(compareEntries);

  const resolvedEntries = queue
    .filter(entry => !ACTIVE_STATUSES.includes(entry.status))
    .sort((left, right) => Date.parse(right.queuedAt) - Date.parse(left.queuedAt));

  return [...activeEntries, ...resolvedEntries].map(entry =>
  {
    const serialized = serializeEntry(entry);
    const activeIndex = activeEntries.findIndex(item => item.sessionId === entry.sessionId);

    return {
      ...serialized,
      queuePosition: activeIndex >= 0 ? activeIndex + 1 : null
    };
  });
}



function findEntry(sessionId)
{
  return queue.find(entry => entry.sessionId === sessionId);
}



function updatePatient(sessionId, updates)
{
  const entry = findEntry(sessionId);

  if (!entry)
  {
    const error = new Error("Queue entry not found");

    error.statusCode = 404;

    throw error;
  }

  if (updates.patientId !== undefined)
  {
    entry.patientId = updates.patientId.trim();
  }

  if (updates.healthInsurance !== undefined)
  {
    entry.healthInsurance = updates.healthInsurance.trim();
  }

  if (updates.aboutDetails !== undefined)
  {
    entry.aboutDetails = updates.aboutDetails.trim();
  }

  entry.anonymous = !entry.patientId && !entry.healthInsurance;

  return serializeEntry(entry);
}



function getPatient(sessionId)
{
  const entry = findEntry(sessionId);

  if (!entry)
  {
    const error = new Error("Queue entry not found");

    error.statusCode = 404;

    throw error;
  }

  return serializeEntry(entry);
}



function resolvePatient(sessionId, status)
{
  const entry = findEntry(sessionId);

  if (!entry)
  {
    const error = new Error("Queue entry not found");

    error.statusCode = 404;

    throw error;
  }

  entry.status = status;

  return serializeEntry(entry);
}



function startAssessing(sessionId)
{
  const entry = findEntry(sessionId);

  if (!entry)
  {
    const error = new Error("Queue entry not found");

    error.statusCode = 404;

    throw error;
  }

  entry.status = "assessing";

  return serializeEntry(entry);
}



function getPriorityLevels()
{
  return [...PRIORITY_LEVELS];
}



function resetQueue()
{
  queue.length = 0;
  sequence = 0;
}

module.exports = {
  ACTIVE_STATUSES,
  PUBLIC_QUEUE_STATUSES,
  enqueuePatient,
  getAdminQueue,
  getPatient,
  getPriorityLevels,
  getQueue,
  resolvePatient,
  resetQueue,
  startAssessing,
  updatePatient
};
