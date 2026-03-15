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

function enqueuePatient(sessionId, priority)
{
  if (!priorityRank.hasOwnProperty(priority))
  {
    throw new Error("Invalid priority level");
  }

  const entry =
  {
    sessionId,
    priority,
    sequence: sequence++,
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
  return queue.map((entry, index) =>
  {
    return {
      sessionId: entry.sessionId,
      priority: entry.priority,
      queuePosition: index + 1,
      queuedAt: entry.queuedAt
    };
  });
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
  enqueuePatient,
  getPriorityLevels,
  getQueue,
  resetQueue
};
