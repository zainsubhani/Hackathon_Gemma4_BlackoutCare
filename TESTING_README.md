# Backend Testing Guide

This document explains the automated tests for the BlackoutCare backend.

## Why Tests Matter

The backend handles clinical downtime workflows, authentication, AI fallback behavior, audit events, and exports. Tests make sure the core promises keep working as the code changes.

For this project, tests are especially useful because they catch issues such as:

- Broken imports after file renames
- Missing dependencies
- Passwords accidentally being returned in API responses
- Auth-protected endpoints becoming public
- Protocol search returning incorrect matches
- AI/Ollama failures crashing the API instead of returning safe fallback guidance
- PDF export generation breaking

## Test Strategy

The tests are intentionally focused. They validate high-risk behavior rather than trying to cover every line.

Current coverage includes:

- User creation hashes passwords
- Login returns a bearer token
- Protected patient routes require authentication
- Protocol creation requires an admin/coordinator role
- Protocol search returns keyword matches
- PDF export returns a valid PDF response
- Triage AI failure returns a safe `503` response
- Patient creation writes a `PATIENT_CREATED` audit event
- Triage status update writes a `TRIAGE_STATUS_UPDATED` audit event
- JSON export writes a `DOWNTIME_REPORT_EXPORTED` audit event

## Test Database

Tests use an in-memory SQLite database. This means:

- No Docker container is required.
- Tests do not touch local Postgres data.
- Tests run quickly.
- Each test starts from a clean database.

The test database is configured in:

```text
backend/tests/conftest.py
```

## Run Tests

From the project root:

```bash
cd backend
./.venv/bin/python -m pytest
```

Run a single file:

```bash
cd backend
./.venv/bin/python -m pytest tests/test_auth_and_users.py
```

Run with verbose output:

```bash
cd backend
./.venv/bin/python -m pytest -v
```

## Important Fixtures

`client`

Creates a FastAPI test client and overrides the production database dependency with the in-memory test database.

`db_session`

Creates a clean database schema for every test.

`auth_headers`

Creates a demo doctor user, logs in, and returns a bearer token header for protected endpoints.

## What To Add Next

Good next tests:

- Full downtime report includes event timeline and critical count
- Invalid login returns `401`
- Expired/invalid token returns `401`
- Pagination and filtering behavior for list endpoints

## Recruiter/Judge Summary

These tests show that the backend is not only a working demo, but has engineering checks around the most important behavior: auth, clinical workflow protection, protocol search, AI failure safety, and exports.
