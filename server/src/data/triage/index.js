const priorityLevels = require("./priority-levels.json");
const intakeFlow = require("./intake-flow.json");
const allergyOptions = require("./allergy-options.json");
const medicalConditions = require("./medical-conditions.json");
const complaintFlows = require("./complaint-flows.json");
const terminalNodes = require("./terminal-nodes.json");



function buildIntakeQuestion(question)
{
  if (question.id === "allergy_details")
  {
    return {
      ...question,
      options: allergyOptions
    };
  }

  if (question.id === "comorbidities")
  {
    return {
      ...question,
      options: medicalConditions
    };
  }

  return question;
}



module.exports =
{
  priorityLevels,
  globalQuestions: intakeFlow.map(buildIntakeQuestion),
  globalRedFlags: complaintFlows.globalRedFlags,
  flows: complaintFlows.flows,
  terminalNodes
};
