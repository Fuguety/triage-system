const { v4: uuidv4 } = require("uuid");

const sessions = new Map();

const questions =
{
  q1:
  {
    id: "q1",
    text: "Is the patient unconscious or unresponsive?",
    answers:
    [
      { id: "yes", label: "Yes", next: "END_RESUSCITATION" },
      { id: "no", label: "No", next: "q2" }
    ]
  },
  q2:
  {
    id: "q2",
    text: "Is the patient having serious trouble breathing?",
    answers:
    [
      { id: "yes", label: "Yes", next: "END_EMERGENT" },
      { id: "no", label: "No", next: "q3" }
    ]
  },
  q3:
  {
    id: "q3",
    text: "Does the patient have chest pain or signs of severe injury?",
    answers:
    [
      { id: "yes", label: "Yes", next: "END_URGENT" },
      { id: "no", label: "No", next: "q4" }
    ]
  },
  q4:
  {
    id: "q4",
    text: "Does the patient have moderate pain, fever, or worsening symptoms?",
    answers:
    [
      { id: "yes", label: "Yes", next: "END_LESS_URGENT" },
      { id: "no", label: "No", next: "END_NON_URGENT" }
    ]
  }
};

const priorityMap =
{
  END_RESUSCITATION: "RESUSCITATION",
  END_EMERGENT: "EMERGENT",
  END_URGENT: "URGENT",
  END_LESS_URGENT: "LESS_URGENT",
  END_NON_URGENT: "NON_URGENT"
};

function createError(message, statusCode)
{
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

function startTriage()
{
  const sessionId = uuidv4();

  sessions.set(sessionId,
  {
    currentQuestion: "q1",
    completed: false
  });

  return {
    sessionId,
    question: questions.q1
  };
}

function answerQuestion(sessionId, answerId)
{
  const session = sessions.get(sessionId);

  if (!session)
  {
    throw createError("Session not found", 404);
  }

  if (session.completed)
  {
    throw createError("Session already completed", 409);
  }

  const currentQuestion = questions[session.currentQuestion];

  if (!currentQuestion)
  {
    throw createError("Invalid session state", 500);
  }

  const selectedAnswer = currentQuestion.answers.find(answer => answer.id === answerId);

  if (!selectedAnswer)
  {
    throw createError("Invalid answer", 400);
  }

  if (selectedAnswer.next.startsWith("END"))
  {
    const priority = priorityMap[selectedAnswer.next];

    session.completed = true;
    session.priority = priority;

    return {
      done: true,
      sessionId,
      priority
    };
  }

  session.currentQuestion = selectedAnswer.next;

  return {
    done: false,
    question: questions[selectedAnswer.next]
  };
}

function resetTriageSessions()
{
  sessions.clear();
}

module.exports = {
  answerQuestion,
  resetTriageSessions,
  startTriage
};
