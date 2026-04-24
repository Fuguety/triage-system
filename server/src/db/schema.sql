CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS patient_number_sequence START WITH 1000;

CREATE TABLE IF NOT EXISTS hospitals
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'hospital_staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hospitals_email_check CHECK
  (
    email = LOWER(email)
  ),
  CONSTRAINT hospitals_role_check CHECK
  (
    role IN
    (
      'admin',
      'hospital_staff'
    )
  )
);

CREATE TABLE IF NOT EXISTS patients
(
  id BIGSERIAL PRIMARY KEY,
  patient_number BIGINT NOT NULL UNIQUE DEFAULT nextval('patient_number_sequence'),
  full_name VARCHAR(150),
  patient_identifier VARCHAR(100),
  health_insurance VARCHAR(100),
  anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT patients_identification_check CHECK
  (
    anonymous = TRUE
    OR full_name IS NOT NULL
    OR patient_identifier IS NOT NULL
    OR health_insurance IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS triage_sessions
(
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
  current_question VARCHAR(100) NOT NULL DEFAULT 'q1',
  priority_level VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  symptoms_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  CONSTRAINT triage_sessions_priority_level_check CHECK
  (
    priority_level IS NULL
    OR priority_level IN
    (
      'RESUSCITATION',
      'EMERGENT',
      'URGENT',
      'LESS_URGENT',
      'NON_URGENT'
    )
  ),
  CONSTRAINT triage_sessions_status_check CHECK
  (
    status IN
    (
      'active',
      'completed',
      'cancelled'
    )
  ),
  CONSTRAINT triage_sessions_completed_at_check CHECK
  (
    completed_at IS NULL
    OR completed_at >= created_at
  )
);

CREATE TABLE IF NOT EXISTS queue
(
  id BIGSERIAL PRIMARY KEY,
  triage_session_id BIGINT NOT NULL UNIQUE REFERENCES triage_sessions(id) ON DELETE CASCADE,
  priority_level VARCHAR(50) NOT NULL,
  queue_position INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  assigned_staff VARCHAR(150),
  about_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT queue_priority_level_check CHECK
  (
    priority_level IN
    (
      'RESUSCITATION',
      'EMERGENT',
      'URGENT',
      'LESS_URGENT',
      'NON_URGENT'
    )
  ),
  CONSTRAINT queue_position_check CHECK
  (
    queue_position IS NULL
    OR queue_position > 0
  ),
  CONSTRAINT queue_status_check CHECK
  (
    status IN
    (
      'waiting',
      'assessing',
      'completed',
      'rejected'
    )
  )
);

CREATE TABLE IF NOT EXISTS audit_logs
(
  id BIGSERIAL PRIMARY KEY,
  actor_name VARCHAR(150) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(150) NOT NULL,
  details JSONB,
  session_id UUID REFERENCES triage_sessions(session_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS triage_sessions_patient_id_index
ON triage_sessions(patient_id);

CREATE INDEX IF NOT EXISTS hospitals_email_index
ON hospitals(email);

CREATE INDEX IF NOT EXISTS triage_sessions_session_id_index
ON triage_sessions(session_id);

CREATE INDEX IF NOT EXISTS triage_sessions_status_index
ON triage_sessions(status);

CREATE INDEX IF NOT EXISTS queue_triage_session_id_index
ON queue(triage_session_id);

CREATE INDEX IF NOT EXISTS queue_status_index
ON queue(status);

CREATE INDEX IF NOT EXISTS queue_priority_created_at_index
ON queue(priority_level, created_at);

CREATE INDEX IF NOT EXISTS audit_logs_session_id_index
ON audit_logs(session_id);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_index
ON audit_logs(created_at);

DROP TRIGGER IF EXISTS queue_updated_at_trigger ON queue;

CREATE OR REPLACE FUNCTION update_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_updated_at_trigger
BEFORE UPDATE ON queue
FOR EACH ROW
EXECUTE FUNCTION update_queue_updated_at();
