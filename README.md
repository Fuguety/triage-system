# Triage Support System

Web-based medical triage support system developed for a university thesis.

The system helps organize incoming patients by asking structured symptom questions and assigning a triage priority. It is designed to support medical staff with prioritization and queue management. It does not provide diagnoses.

## Project Goal

The goal of this project is to build a clinical triage support system with:

- A React frontend for patient interaction
- A Node.js and Express backend API
- A rule-based triage flow in the current phase
- A future PostgreSQL database layer
- A future AI-assisted decision engine

## Current Architecture

```text
React frontend
      |
      v
Node.js API
      |
      v
Decision engine
      |
      v
Database
```

## Tech Stack

### Frontend

- React
- Vite
- React Router

### Backend

- Node.js
- Express
- CommonJS modules

### Planned Later

- PostgreSQL
- Python-based decision tree or AI model

## Current Features

The current backend provides:

- `GET /health`
- `POST /triage/start`
- `POST /triage/answer`
- `GET /triage/queue`

The current triage flow:

- Starts a session in memory
- Returns the first symptom question
- Accepts answers one step at a time
- Returns a triage priority and queue position at completion
- Stores the queue in memory with triage-based ordering

Sessions are currently stored in memory:

```javascript
const sessions = new Map();
```

## Priority Levels

The triage system uses five priority levels:

- `RESUSCITATION`
- `EMERGENT`
- `URGENT`
- `LESS_URGENT`
- `NON_URGENT`

Higher priority patients should be handled before lower priority patients. Within the same priority level, patients should remain in first-come, first-served order.

## Current Folder Structure

```text
triage-system
├─ client
│  ├─ src
│  ├─ public
│  └─ package.json
├─ server
│  ├─ src
│  │  ├─ controllers
│  │  ├─ routers
│  │  ├─ services
│  │  └─ app.js
│  ├─ server.js
│  └─ package.json
└─ README.md
```

## Backend API

### Health Check

`GET /health`

Example response:

```json
{
  "status": "OK"
}
```

### Start Triage

`POST /triage/start`

Example response:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "question": {
    "id": "q1",
    "text": "Are you having trouble breathing?",
    "answers": [
      { "id": "yes", "label": "Yes", "next": "END_HIGH" },
      { "id": "no", "label": "No", "next": "q2" }
    ]
  }
}
```

### Answer Question

`POST /triage/answer`

Example request:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "answerId": "yes"
}
```

Example response when triage continues:

```json
{
  "done": false,
  "question": {
    "id": "q2",
    "text": "Do you have chest pain?",
    "answers": [
      { "id": "yes", "label": "Yes", "next": "END_MED" },
      { "id": "no", "label": "No", "next": "END_LOW" }
    ]
  }
}
```

Example response when triage finishes:

```json
{
  "done": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "priority": "URGENT",
  "queuePosition": 2
}
```

### View Queue

`GET /triage/queue`

Example response:

```json
{
  "priorities": [
    "RESUSCITATION",
    "EMERGENT",
    "URGENT",
    "LESS_URGENT",
    "NON_URGENT"
  ],
  "patients": [
    {
      "sessionId": "11111111-1111-1111-1111-111111111111",
      "priority": "RESUSCITATION",
      "queuePosition": 1,
      "queuedAt": "2026-03-15T10:15:30.000Z"
    },
    {
      "sessionId": "22222222-2222-2222-2222-222222222222",
      "priority": "URGENT",
      "queuePosition": 2,
      "queuedAt": "2026-03-15T10:16:10.000Z"
    }
  ]
}
```

## Current Limitations

This project is still in an early backend prototype stage.

Current limitations:

- No persistent database yet
- No queue system yet
- No authentication yet
- No clinician dashboard yet
- No completed frontend assessment flow yet
- No automated tests yet
- Triage questions are hardcoded
- Sessions are lost when the server restarts

## Planned Next Steps

- Move business logic into services
- Add PostgreSQL persistence
- Store sessions, answers, and results
- Replace hardcoded logic with a configurable decision model
- Add frontend integration with the API
- Add validation and automated tests

## Running The Project

### Backend

```bash
cd server
npm install
npm run dev
```

The backend runs by default on:

```text
http://localhost:5000
```

### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend runs with Vite in development mode.

## Thesis Context

This application is intended as a triage support tool for academic and software engineering purposes. It is meant to assist staff with prioritization logic and workflow organization. It should not be treated as a diagnostic system or a substitute for professional medical judgment.
