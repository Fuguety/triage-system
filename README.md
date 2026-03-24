# Triage Support System

Web-based medical triage support system developed for a university thesis.

The platform helps collect patient intake data, guide patients through structured symptom questions, assign a triage priority, and organize the queue for hospital staff. It supports medical workflow, but it does not provide diagnoses.

## Current Stack

### Frontend

- React
- Vite
- React Router

### Backend

- Node.js
- Express
- CommonJS

### Database

- PostgreSQL
- Docker Compose for the PostgreSQL container only

## Current Architecture

```text
React frontend
      |
      v
Node.js API
      |
      v
Rule-based triage service
      |
      v
PostgreSQL
```

## Main Features

- Patient intake with optional anonymous flow
- Rule-based triage questionnaire
- Five urgency levels
- Queue ordering by priority
- Hospital staff login and admin panel
- Audit log
- PostgreSQL connection and schema bootstrap

## Priority Levels

- `RESUSCITATION`
- `EMERGENT`
- `URGENT`
- `LESS_URGENT`
- `NON_URGENT`

## Where The Questions Are Stored

The current triage questions are hardcoded in:

- [server/src/services/triage.service.js](/c:/Users/lucze/UNI/THESIS/triage-system/server/src/services/triage.service.js)

They are stored in the `questions` object.

## Where The Priority Logic Is

The current rule-based priority logic is also in:

- [server/src/services/triage.service.js](/c:/Users/lucze/UNI/THESIS/triage-system/server/src/services/triage.service.js)

Important parts:

- `questions`: controls the question flow
- `priorityMap`: maps terminal `END_*` values to final urgency levels
- `answerQuestion()`: decides whether the next answer moves to another question or ends triage with a final priority

## Queue Logic

Queue logic is handled in:

- [server/src/services/queue.service.js](/c:/Users/lucze/UNI/THESIS/triage-system/server/src/services/queue.service.js)

It is responsible for:

- inserting patients into the queue
- sorting by priority
- keeping first-come, first-served inside the same level
- separating public queue visibility from admin workflow states

## Database Files

- Docker config: [docker-compose.yml](/c:/Users/lucze/UNI/THESIS/triage-system/docker-compose.yml)
- DB connection: [server/src/db/db.js](/c:/Users/lucze/UNI/THESIS/triage-system/server/src/db/db.js)
- Schema: [server/src/db/init.sql](/c:/Users/lucze/UNI/THESIS/triage-system/server/src/db/init.sql)

## SQL Tables

The PostgreSQL schema currently creates:

- `patients`
- `triage_sessions`
- `queue`
- `audit_logs`

## API Routes

### Public

- `GET /health`
- `POST /triage/start`
- `POST /triage/answer`
- `GET /triage/queue`

### Admin / Hospital

- `POST /auth/register`
- `POST /auth/login`
- `GET /admin/queue`
- `GET /admin/queue/:sessionId`
- `PATCH /admin/queue/:sessionId`
- `POST /admin/queue/:sessionId/assess`
- `POST /admin/queue/:sessionId/complete`
- `POST /admin/queue/:sessionId/reject`
- `GET /admin/audit`

## Run The Project

### 1. Start PostgreSQL

```bash
docker compose up -d
```

PostgreSQL runs with:

- database: `triage_system`
- user: `postgres`
- password: `postgres`
- port: `5432`

### 2. Start Backend

```bash
cd server
npm install
npm run dev
```

Backend default URL:

```text
http://localhost:5000
```

### 3. Start Frontend

```bash
cd client
npm install
npm run dev
```

Frontend default URL:

```text
http://localhost:5173
```

## Current Limitations

- triage questions are still hardcoded
- triage logic is still rule-based placeholder logic
- PostgreSQL schema exists, but most runtime app data is still managed in memory
- no Python AI model yet
- no production deployment yet

## Planned Next Steps

- move active runtime data fully into PostgreSQL
- store patient sessions and answers persistently
- replace hardcoded questions with configurable data
- add a future decision-tree / AI engine
- improve clinical traceability and reporting

## Thesis Note

This system is a decision-support prototype for academic use. It is intended to assist staff with prioritization and workflow, not replace professional medical judgment.
