const test = require("node:test");
const assert = require("node:assert/strict");

const authService = require("./auth.service");

test.beforeEach(() =>
{
  authService.resetHospitals();
});

test("registers and logs in a hospital", async () =>
{
  const registration = await authService.registerHospital("General Hospital", "admin@test.com", "secret123");
  const login = await authService.loginHospital("admin@test.com", "secret123");

  assert.ok(registration.token);
  assert.equal(registration.hospital.role, "hospital_staff");
  assert.equal(login.hospital.email, "admin@test.com");
});

test("provides a seeded debug hospital", async () =>
{
  const login = await authService.loginHospital("debug@triage.local", "debug123");

  assert.equal(login.hospital.name, "Debug Hospital");
  assert.equal(login.hospital.role, "admin");
});
