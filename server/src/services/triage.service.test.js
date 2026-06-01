const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../db/database");
const triageService = require("./triage.service");



async function answerIntakeQuestions(sessionId, chiefComplaint, options = {})
{
  await triageService.answerQuestion(sessionId, "other");
  await triageService.answerQuestion(sessionId, options.ageGroup || "young_adult");
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, options.conditions || ["none"]);

  await triageService.answerQuestion(sessionId, chiefComplaint);

  return triageService.answerQuestion(sessionId, options.symptomOnset || "one_to_twenty_four_hours");
}



async function fetchSymptomsSummary(sessionId)
{
  const result = await db.pool.query(
    "SELECT symptoms_summary FROM triage_sessions WHERE session_id = $1",
    [sessionId]
  );

  return result.rows[0].symptoms_summary;
}



async function fetchTriageSession(sessionId)
{
  const result = await db.pool.query(
    "SELECT priority_level, symptoms_summary FROM triage_sessions WHERE session_id = $1",
    [sessionId]
  );

  return result.rows[0];
}



async function answerNoToRedFlags(sessionId)
{
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");
  await triageService.answerQuestion(sessionId, "no");

  return triageService.answerQuestion(sessionId, "no");
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



test("starts triage with the first global question", async () =>
{
  const result = await triageService.startTriage();

  assert.ok(result.sessionId);
  assert.equal(result.patientNumber, 1000);
  assert.equal(result.anonymous, true);
  assert.equal(result.question.id, "gender");
  assert.equal(result.question.text, "What is your gender?");
  assert.deepEqual(result.question.answers,
  [
    { id: "male", label: "Male" },
    { id: "female", label: "Female" },
    { id: "other", label: "Other" },
    { id: "prefer_not_to_say", label: "Prefer not to say" }
  ]);
});



test("keeps optional intake details and marks identified patients as non-anonymous", async () =>
{
  const result = await triageService.startTriage(
  {
    fullName: "Ana Garcia",
    patientId: "ABC123",
    healthInsurance: "TK"
  });

  assert.equal(result.patientNumber, 1000);
  assert.equal(result.fullName, "Ana Garcia");
  assert.equal(result.anonymous, false);
});



test("progresses through global questions", async () =>
{
  const session = await triageService.startTriage();

  const genderResult = await triageService.answerQuestion(session.sessionId, "other");

  assert.equal(genderResult.done, false);
  assert.equal(genderResult.question.id, "age_group");
  assert.equal(genderResult.question.text, "How old are you?");
  assert.deepEqual(genderResult.question.answers,
  [
    { id: "child", label: "0–12 years" },
    { id: "adolescent", label: "13–17 years" },
    { id: "young_adult", label: "18–39 years" },
    { id: "middle_adult", label: "40–64 years" },
    { id: "elderly", label: "65+ years" }
  ]);

  const ageResult = await triageService.answerQuestion(session.sessionId, "young_adult");

  assert.equal(ageResult.done, false);
  assert.equal(ageResult.question.id, "pregnancy_possible");

  const pregnancyPossibleResult = await triageService.answerQuestion(session.sessionId, "no");

  assert.equal(pregnancyPossibleResult.done, false);
  assert.equal(pregnancyPossibleResult.question.id, "allergies");
  assert.deepEqual(pregnancyPossibleResult.question.answers,
  [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
    { id: "not_sure", label: "Not sure" }
  ]);

  const allergyResult = await triageService.answerQuestion(session.sessionId, "no");

  assert.equal(allergyResult.done, false);
  assert.equal(allergyResult.question.id, "comorbidities");
  assert.deepEqual(allergyResult.question.answers,
  [
    { id: "none", label: "None" },
    { id: "asthma", label: "Asthma" },
    { id: "epilepsy", label: "Epilepsy" },
    { id: "hypertension", label: "Hypertension" },
    { id: "diabetes", label: "Diabetes" },
    { id: "heart_disease", label: "Heart disease" },
    { id: "lung_disease", label: "Lung disease" },
    { id: "cancer", label: "Cancer" },
    { id: "celiac_disease", label: "Celiac disease" },
    { id: "gluten_intolerance_sensitivity", label: "Gluten intolerance / sensitivity" },
    { id: "other", label: "Other" }
  ]);

  const conditionsResult = await triageService.answerQuestion(session.sessionId, ["none"]);

  assert.equal(conditionsResult.done, false);
  assert.equal(conditionsResult.question.id, "chief_complaint");
  assert.equal(conditionsResult.question.text, "What is your main symptom?");
  assert.deepEqual(conditionsResult.question.answers,
  [
    { id: "difficulty_breathing", label: "Breathing difficulty" },
    { id: "chest_pain", label: "Chest pain" },
    { id: "fever", label: "Fever" },
    { id: "neurological_symptoms", label: "Neurological symptoms" },
    { id: "vomiting_dehydration", label: "Vomiting or dehydration" },
    { id: "trauma_bleeding", label: "Trauma or bleeding" },
    { id: "general_pain", label: "Pain" },
    { id: "other_not_sure", label: "Other / not sure" }
  ]);

  const complaintResult = await triageService.answerQuestion(session.sessionId, "chest_pain");

  assert.equal(complaintResult.done, false);
  assert.equal(complaintResult.question.id, "symptom_onset");

  const onsetResult = await triageService.answerQuestion(session.sessionId, "one_to_twenty_four_hours");

  assert.equal(onsetResult.done, false);
  assert.equal(onsetResult.question.id, "unconscious_or_unresponsive");
});



test("asks female pregnancy duration when pregnancy is confirmed", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "female");
  await triageService.answerQuestion(session.sessionId, "young_adult");

  const pregnancyResult = await triageService.answerQuestion(session.sessionId, "yes");

  assert.equal(pregnancyResult.done, false);
  assert.equal(pregnancyResult.question.id, "pregnancy_weeks");
  assert.deepEqual(pregnancyResult.question.answers,
  [
    { id: "less_than_twelve_weeks", label: "Less than 12 weeks" },
    { id: "twelve_to_twenty_seven_weeks", label: "12–27 weeks" },
    { id: "twenty_eight_or_more_weeks", label: "28+ weeks" },
    { id: "not_sure", label: "Not sure" }
  ]);

  const allergiesResult = await triageService.answerQuestion(session.sessionId, "not_sure");

  assert.equal(allergiesResult.done, false);
  assert.equal(allergiesResult.question.id, "allergies");

  const symptomsSummary = await fetchSymptomsSummary(session.sessionId);

  assert.match(symptomsSummary, /gender: female/);
  assert.match(symptomsSummary, /pregnancy_status: yes/);
  assert.match(symptomsSummary, /pregnancy_weeks: not_sure/);
});



test("asks last period when female pregnancy answer is no or not sure", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "female");
  await triageService.answerQuestion(session.sessionId, "young_adult");

  const lastPeriodResult = await triageService.answerQuestion(session.sessionId, "not_sure");

  assert.equal(lastPeriodResult.done, false);
  assert.equal(lastPeriodResult.question.id, "last_period");
  assert.deepEqual(lastPeriodResult.question.answers,
  [
    { id: "less_than_one_month", label: "Less than 1 month ago" },
    { id: "one_to_three_months", label: "1–3 months ago" },
    { id: "more_than_three_months", label: "More than 3 months ago" },
    { id: "not_sure", label: "Not sure" },
    { id: "not_applicable", label: "Not applicable" }
  ]);

  const allergiesResult = await triageService.answerQuestion(session.sessionId, "one_to_three_months");

  assert.equal(allergiesResult.done, false);
  assert.equal(allergiesResult.question.id, "allergies");

  const symptomsSummary = await fetchSymptomsSummary(session.sessionId);

  assert.match(symptomsSummary, /gender: female/);
  assert.match(symptomsSummary, /pregnancy_status: not_sure/);
  assert.match(symptomsSummary, /last_period: one_to_three_months/);
});



test("asks pregnancy possibility for other or undisclosed gender", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "prefer_not_to_say");

  const result = await triageService.answerQuestion(session.sessionId, "young_adult");

  assert.equal(result.done, false);
  assert.equal(result.question.id, "pregnancy_possible");
});



test("asks pregnancy and last period questions when pregnancy is possible for undisclosed gender", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "prefer_not_to_say");
  await triageService.answerQuestion(session.sessionId, "young_adult");
  await triageService.answerQuestion(session.sessionId, "yes");
  await triageService.answerQuestion(session.sessionId, "yes");

  const lastPeriodResult = await triageService.answerQuestion(session.sessionId, "not_sure");

  assert.equal(lastPeriodResult.done, false);
  assert.equal(lastPeriodResult.question.id, "last_period");
});



test("asks allergy details when allergies are present or uncertain", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "other");
  await triageService.answerQuestion(session.sessionId, "young_adult");
  await triageService.answerQuestion(session.sessionId, "no");

  const allergyDetailsResult = await triageService.answerQuestion(session.sessionId, "not_sure");

  assert.equal(allergyDetailsResult.done, false);
  assert.equal(allergyDetailsResult.question.id, "allergy_details");
  assert.deepEqual(allergyDetailsResult.question.answers,
  [
    { id: "medication_allergy", label: "Medication allergy" },
    { id: "food_allergy", label: "Food allergy" },
    { id: "wheat_allergy", label: "Wheat allergy" },
    { id: "insect_sting_allergy", label: "Insect sting allergy" },
    { id: "latex_allergy", label: "Latex allergy" },
    { id: "pollen_allergy", label: "Pollen allergy" },
    { id: "dust_allergy", label: "Dust allergy" },
    { id: "animal_allergy", label: "Animal allergy" },
    { id: "mold_allergy", label: "Mold allergy" },
    { id: "contrast_dye_allergy", label: "Contrast dye allergy" },
    { id: "other", label: "Other" },
    { id: "not_sure", label: "Not sure" }
  ]);

  const conditionsResult = await triageService.answerQuestion(session.sessionId, ["medication_allergy"]);

  assert.equal(conditionsResult.done, false);
  assert.equal(conditionsResult.question.id, "comorbidities");
});



test("keeps male-specific warning as provisional until follow-up is complete", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "male");
  await triageService.answerQuestion(session.sessionId, "young_adult");
  await triageService.answerQuestion(session.sessionId, "yes");
  await triageService.answerQuestion(session.sessionId, "no");
  await triageService.answerQuestion(session.sessionId, ["none"]);
  await triageService.answerQuestion(session.sessionId, "general_pain");

  const warningResult = await triageService.answerQuestion(session.sessionId, "one_to_twenty_four_hours");

  assert.equal(warningResult.done, false);
  assert.equal(warningResult.question.id, "unconscious_or_unresponsive");

  const symptomsSummary = await fetchSymptomsSummary(session.sessionId);

  assert.match(symptomsSummary, /gender: male/);
  assert.match(symptomsSummary, /male_specific_warning: yes/);
});



test("continues to allergies when male-specific warning signs are absent", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "male");
  await triageService.answerQuestion(session.sessionId, "young_adult");

  const result = await triageService.answerQuestion(session.sessionId, "no");

  assert.equal(result.done, false);
  assert.equal(result.question.id, "allergies");
});



test("moves back one question before final submission", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "other");

  const result = await triageService.goBackQuestion(session.sessionId);
  const symptomsSummary = await fetchSymptomsSummary(session.sessionId);

  assert.equal(result.done, false);
  assert.equal(result.question.id, "gender");
  assert.equal(symptomsSummary, null);
});



test("enters the selected complaint flow after global red flags", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "chest_pain");

  const redFlagResult = await answerNoToRedFlags(session.sessionId);

  assert.equal(redFlagResult.done, false);
  assert.equal(redFlagResult.question.id, "chest_1");
});



test("returns a terminal priority from a complaint flow", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "general_pain");
  await answerNoToRedFlags(session.sessionId);
  await triageService.answerQuestion(session.sessionId, "no");
  await triageService.answerQuestion(session.sessionId, "no");

  const result = await triageService.answerQuestion(session.sessionId, "no");

  assert.equal(result.done, true);
  assert.equal(result.priority, "LESS_URGENT");
  assert.equal(result.patientNumber, 1000);
});



test("returns a terminal priority from a global red flag", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "fever");

  const result = await triageService.answerQuestion(session.sessionId, "yes");

  assert.equal(result.done, true);
  assert.equal(result.priority, "RESUSCITATION");
});



test("completes mandatory intake before any terminal priority", async () =>
{
  const session = await triageService.startTriage();

  await triageService.answerQuestion(session.sessionId, "male");

  const result = await triageService.answerQuestion(session.sessionId, "young_adult");

  assert.equal(result.done, false);
  assert.equal(result.question.id, "male_specific_warning");
});



test("does not finish immediately after a provisional warning answer", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "general_pain");
  await answerNoToRedFlags(session.sessionId);

  const result = await triageService.answerQuestion(session.sessionId, "yes");

  assert.equal(result.done, false);
  assert.equal(result.question.id, "pain_2");
});



test("skips repeated medical condition questions using intake answers", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "difficulty_breathing",
  {
    conditions: ["asthma"]
  });
  await answerNoToRedFlags(session.sessionId);
  await triageService.answerQuestion(session.sessionId, "no");

  const result = await triageService.answerQuestion(session.sessionId, "no");
  const symptomsSummary = await fetchSymptomsSummary(session.sessionId);

  assert.equal(result.done, false);
  assert.equal(result.question.id, "breathing_4");
  assert.match(symptomsSummary, /breathing_3: yes \(derived from intake: asthma\)/);
});



test("uses derived risk factors to affect final priority", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "chest_pain",
  {
    conditions: ["diabetes"]
  });
  await answerNoToRedFlags(session.sessionId);
  await triageService.answerQuestion(session.sessionId, "no");
  await triageService.answerQuestion(session.sessionId, "no");

  const result = await triageService.answerQuestion(session.sessionId, "no");
  const symptomsSummary = await fetchSymptomsSummary(session.sessionId);

  assert.equal(result.done, true);
  assert.equal(result.priority, "URGENT");
  assert.match(symptomsSummary, /chest_4: yes \(derived from intake: diabetes\)/);
});



test("reuses symptom onset for duration follow-up questions", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "vomiting_dehydration",
  {
    symptomOnset: "one_to_three_days"
  });
  await answerNoToRedFlags(session.sessionId);
  await triageService.answerQuestion(session.sessionId, "no");

  const result = await triageService.answerQuestion(session.sessionId, "no");
  const symptomsSummary = await fetchSymptomsSummary(session.sessionId);

  assert.equal(result.done, true);
  assert.equal(result.priority, "LESS_URGENT");
  assert.match(symptomsSummary, /vomiting_4: yes \(derived from intake: onset more than 24 hours\)/);
});



test("allows provisional priority to be lowered by follow-up answers", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "general_pain",
  {
    symptomOnset: "more_than_one_month"
  });
  await answerNoToRedFlags(session.sessionId);
  await triageService.answerQuestion(session.sessionId, "yes");
  await triageService.answerQuestion(session.sessionId, "no");

  const result = await triageService.answerQuestion(session.sessionId, "no");
  const storedSession = await fetchTriageSession(session.sessionId);

  assert.equal(result.done, true);
  assert.equal(result.priority, "NON_URGENT");
  assert.equal(storedSession.priority_level, "NON_URGENT");
  assert.match(storedSession.symptoms_summary, /pain_1: yes/);
  assert.match(storedSession.symptoms_summary, /pain_4: yes \(derived from intake: onset more than 1 month\)/);
});



test("allows provisional priority to be raised by follow-up answers", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "fever",
  {
    ageGroup: "elderly"
  });
  await answerNoToRedFlags(session.sessionId);
  await triageService.answerQuestion(session.sessionId, "no");

  const result = await triageService.answerQuestion(session.sessionId, "no");
  const symptomsSummary = await fetchSymptomsSummary(session.sessionId);

  assert.equal(result.done, true);
  assert.equal(result.priority, "URGENT");
  assert.match(symptomsSummary, /fever_4: yes \(derived from intake: age 65\+\)/);
});



test("keeps locked priority for true critical emergencies", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "difficulty_breathing");

  const result = await triageService.answerQuestion(session.sessionId, "yes");
  const storedSession = await fetchTriageSession(session.sessionId);

  assert.equal(result.done, true);
  assert.equal(result.priority, "RESUSCITATION");
  assert.equal(storedSession.priority_level, "RESUSCITATION");
});



test("routes other or unsure symptoms to less urgent after red flags", async () =>
{
  const session = await triageService.startTriage();

  await answerIntakeQuestions(session.sessionId, "other_not_sure");

  const result = await answerNoToRedFlags(session.sessionId);

  assert.equal(result.done, true);
  assert.equal(result.priority, "LESS_URGENT");
});



test("rejects invalid answers", async () =>
{
  const session = await triageService.startTriage();

  await assert.rejects(
    triageService.answerQuestion(session.sessionId, "maybe"),
  {
    message: "Invalid answer"
  });
});
