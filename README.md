# Triage Support System

Web-based hospital triage support system developed for a university final degree project.

The application collects patient intake data, guides patients through a structured questionnaire, calculates a preliminary priority level, and helps hospital staff manage the active queue. It is a decision-support prototype and does not provide diagnoses.

## Project

**Title:** Digital hospital triage system for automated patient prioritization

**Stack:**

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Docker
- Backend module style: JavaScript CommonJS
- AI support: Hugging Face Inference API
- AI model: `openai/gpt-oss-20b`
- AI module integrated in backend service

## Architecture

```text
React frontend
      |
      v
Node.js + Express API
      |
      v
Triage services / Queue services / Audit services / AI support service
      |
      v
PostgreSQL
```

```text
Backend API
      |
      v
Hugging Face Inference API
      |
      v
AI Support Summary
```

Backend folders:

- `routers`
- `controllers`
- `services`
- `db`
- `data`

## Main Features

- Patient-facing triage questionnaire
- Optional anonymous patient intake
- Gender, age, pregnancy, allergy, condition, symptom, and onset intake
- Multi-select allergies and medical conditions
- Back Question support before final submission
- JSON-based triage flow
- Conditional skip logic for repeated clinical context
- Locked and provisional priority calculation
- Five-level priority classification
- Public queue position view
- Staff/admin login
- Admin queue management
- Patient assessment workspace
- AI Support Summary for staff review
- AI-generated clinical brief
- AI-generated risk factors
- AI-suggested priority
- AI-generated explanation
- AI reviewed checkbox for medical staff
- AI fallback behavior when the external service is unavailable
- Staff priority adjustment with audit logging
- Complete/reject case workflow
- Audit logs
- Accessibility display modes:
  - Default
  - Dark Mode
  - High Contrast Mode
  - Dyslexia-Friendly Mode

## Priority Levels

- `RESUSCITATION`
- `EMERGENT`
- `URGENT`
- `LESS_URGENT`
- `NON_URGENT`

Priority behavior:

- `lockedPriority` is used only for true critical emergencies and cannot be downgraded.
- `provisionalPriority` is used for warning signs that require more context.
- `priorityAdjustment` can raise or lower provisional priority after follow-up answers.
- Final priority is saved only when the questionnaire completes.

## Triage Flow Data

The triage flow is JSON-based and stored in:

- `server/src/data/triage/priority-levels.json`
- `server/src/data/triage/intake-flow.json`
- `server/src/data/triage/allergy-options.json`
- `server/src/data/triage/medical-conditions.json`
- `server/src/data/triage/complaint-flows.json`
- `server/src/data/triage/terminal-nodes.json`
- `server/src/data/triage/index.js`

`server/src/data/triage/index.js` combines the split files into the structure consumed by:

- `server/src/services/triage.service.js`

## Triage Logic

Triage service responsibilities:

- Starts a new patient/session.
- Stores the current question in `triage_sessions.current_question`.
- Validates answers.
- Supports single-select and multi-select questions.
- Stores answers in `symptoms_summary`.
- Applies conditional skip logic when answers can be derived from intake.
- Adds clinically relevant derived facts to `symptoms_summary`.
- Tracks locked and provisional priority from the answer path.
- Saves final `priority_level` and `completed_at`.

Derived flags include:

- `isChild`
- `isAdult`
- `isElderly`
- `isPregnant`
- `pregnancyUnknown`
- `hasDiabetes`
- `hasAsthma`
- `hasLungDisease`
- `hasHeartDisease`
- `hasCancer`
- `hasAllergies`
- `hasSevereOnset`
- `onsetMoreThan24Hours`
- `onsetMoreThan7Days`
- `onsetMoreThan1Month`

## Queue And Admin Logic

Queue logic is handled in:

- `server/src/services/queue.service.js`

It is responsible for:

- Inserting completed assessments into the queue.
- Ordering active patients by priority.
- Keeping first-come, first-served ordering inside the same priority level.
- Returning public queue data.
- Returning staff/admin patient context.
- Updating patient details.
- Updating staff-adjusted priority.
- Keeping queue status compatible with admin workflow.

Admin audit behavior records important staff actions, including priority changes with previous and new priority values.

## AI Support Module

The system integrates Hugging Face Inference API through the backend.

- Current model: `openai/gpt-oss-20b`
- The AI receives a constructed clinical context, not unnecessary personal identification data.
- The AI generates:
  - clinical brief
  - risk factors
  - suggested priority
  - explanatory reason
- The AI is decision support only.
- The rule-based triage logic remains the source of the preliminary priority.
- Medical staff can review, ignore, or override the AI suggestion.
- Medical staff can mark the AI summary as reviewed.
- If the AI service fails, the system uses fallback output and continues working.

Warning: AI output does not replace professional clinical judgment.

## Patient Context

Admin and review screens expose patient context derived from the assessment summary:

- Gender
- Age
- Pregnancy status when relevant
- Pregnancy duration when pregnant
- Last period when relevant
- Allergies
- Medical conditions

## Database

PostgreSQL is run with Docker during development.

Docker config:

- `docker-compose.yml`

Database files:

- `server/src/db/database.js`
- `server/src/db/schema.sql`

Tables:

- `patients`
- `triage_sessions`
- `queue`
- `audit_logs`
- `hospitals`

AI-related fields in `triage_sessions`:

- `ai_brief`
- `ai_suggested_priority`
- `ai_reason`
- `ai_risk_factors`
- `ai_reviewed`
- `ai_reviewed_at`

Default Docker PostgreSQL settings:

- Database: `triage_system`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

## API Routes

Public routes:

- `GET /health`
- `GET /health/ai`
- `POST /triage/start`
- `POST /triage/answer`
- `POST /triage/back`
- `GET /triage/queue`

Authentication routes:

- `POST /auth/register`
- `POST /auth/login`

Admin routes:

- `GET /admin/queue`
- `GET /admin/queue/:sessionId`
- `PATCH /admin/queue/:sessionId`
- `POST /admin/queue/:sessionId/assess`
- `POST /admin/queue/:sessionId/complete`
- `POST /admin/queue/:sessionId/reject`
- `GET /admin/audit`

## Run The Project

Install dependencies from the root, server, and client folders if needed:

```bash
npm install
cd server
npm install
cd ../client
npm install
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Or use the existing npm script:

```bash
npm run db
```

Stop PostgreSQL:

```bash
docker compose down
```

PostgreSQL must be running before starting the backend.

Start backend and frontend together from the root:

```bash
npm run dev
```

Or start them separately:

```bash
npm run dev:server
npm run dev:client
```

Backend default URL:

```text
http://localhost:5000
```

Frontend default URL:

```text
http://localhost:5173
```

## Environment Variables

Backend `.env` example:

```env
PORT=5000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/triage_system
JWT_SECRET=change-this-secret
HF_TOKEN=your_hugging_face_token_here
HF_MODEL=openai/gpt-oss-20b
```

Rules:

- Do not commit `.env`.
- Do not expose Hugging Face tokens.
- Use `.env.example` if needed.

## Tests And Build

Run backend tests:

```bash
cd server
npm test
```

Build frontend:

```bash
cd client
npm run build
```

## Current Limitations

- The AI module is connected through Hugging Face Inference API but is only decision-support.
- The system is not a certified medical device.
- The system is a TFG prototype and not production-ready.
- AI output depends on external API availability.
- No production deployment configuration is included yet.

## Security Notes

- JWT authentication is used for protected staff/admin access.
- Passwords are hashed with bcrypt.
- Admin routes are protected.
- Request input is validated in backend services and controllers.
- Staff actions are recorded through audit logging.
- Secrets are loaded from environment variables.
- Do not commit `.env` files.

## Thesis Note

This system is an academic decision-support prototype. It is intended to assist patient prioritization and staff workflow, not replace clinical judgment by trained medical professionals.
