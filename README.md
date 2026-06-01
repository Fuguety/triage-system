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
- Future AI integration target: Python / Hugging Face service

## Architecture

```text
React frontend
      |
      v
Node.js + Express API
      |
      v
JSON-based triage service
      |
      v
PostgreSQL
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

Default Docker PostgreSQL settings:

- Database: `triage_system`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

## API Routes

Public routes:

- `GET /health`
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
npm run db
```

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

- Triage is rule-based and JSON-driven, not AI-driven.
- The system is not a certified medical device.
- No Python/Hugging Face AI service is connected yet.
- No production deployment configuration is included yet.

## Thesis Note

This system is an academic decision-support prototype. It is intended to assist patient prioritization and staff workflow, not replace clinical judgment by trained medical professionals.
