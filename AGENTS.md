# BattleReadyShelf - Agent Context & Project Guide

## Project Vision

**BattleReadyShelf** is a web application for tabletop wargaming enthusiasts to:
- **Manage collections** of painted/owned miniatures with photos
- **Build army lists** for competitive or casual play (future)
- **Support multiple game systems** eventually (game-agnostic architecture is the long-term goal)

Do not read docs/MODEL.md unless the task involves domain modelling, future architecture, rules/army functionality, or explicitly references that document. For implementation tasks, treat source code, migrations, and OpenAPI as the current source of truth.
See `docs/MODEL.md` for the full target domain model — it is explicitly aspirational; only a small part of it exists in code today (see "Current Domain Model" below).

---

## Architecture Overview

```
Frontend (React + TypeScript + Vite, Mantine UI)
  ↓ HTTPS
Backend (Spring Boot 4 / Java 26)
  ↓
PostgreSQL (Docker locally; RDS in prod, eventually)
Cloudflare R2 (S3-compatible, miniature photos via presigned URLs)
```

**Key Principle:** One monorepo, one backend, one database. Keep it simple — no microservices, no Kubernetes.

---

## Technology Stack (current, verified)

| Layer      | Technology                                      | Notes |
|------------|--------------------------------------------------|-------|
| Frontend   | React + TypeScript, Vite, Mantine + Tabler icons | OpenAPI-generated client (`@hey-api/openapi-ts`) in `src/generated/` |
| Backend    | Spring Boot 4, Java 26                           | Package-by-feature under `com.keith.battlereadyshelf` |
| Database   | PostgreSQL                                       | Local via `backend/compose.yaml` (Docker) |
| Storage    | Cloudflare R2                                    | S3-compatible, AWS SDK v2, presigned PUT/GET/DELETE |
| Auth       | Google OAuth 2.0 (ID token) + internal JWT       | Email allowlist gate on first login |
| Backend tests | JUnit + AssertJ + Mockito (via `spring-boot-starter-webmvc-test`) | No frontend test framework configured yet |
| Migrations | Flyway                                           | Versioned SQL only, in `backend/src/main/resources/db/migration` |
| API contract | OpenAPI (`backend/src/main/resources/openapi/openapi.yaml`) | Server interfaces + frontend client both generated from this one spec |
| CI/CD      | GitHub Actions                                   | See `.github/workflows/` (`backend-ci.yml`, `frontend-ci.yml`, `frontend-deploy.yml`, `qodana_code_quality.yml`) |

---

## Current Domain Model (what actually exists)

- **User** — created on first Google login; has an email allowlist check (`AllowedEmail`) gating auth.
- **ModelDefinition** — a reusable "type" of miniature a user can add to their collection (e.g., "Poxwalker"). Currently user-defined, not a shared game-rules catalog.
- **ArmyCollection** — a user's named collection (foreign-keyed to `User`).
- **CollectionModel** — one specific miniature instance a user owns, belongs to an `ArmyCollection`, references a `ModelDefinition`.
- **CollectionModelImage** — one or more photos attached to a `CollectionModel`, stored in R2, `createdAt` is `Instant` / `TIMESTAMP WITH TIME ZONE`.

All user-owned data (`ArmyCollection`, `CollectionModel`, images) is scoped by `user_id` foreign keys — this is how row-level data segregation is enforced.

The richer "Rules domain" (GameSystem/Faction/UnitDefinition/WargearDefinition/points rules) and "Army domain" (ArmyList/ArmyUnit/validation) described in `docs/MODEL.md` do **not** exist yet — don't assume those entities, endpoints, or tables are present.

---

## Design Rules & Constraints

### Backend
- UUID primary keys on all entities
- Flyway for all schema changes (never manual/manual-run SQL against the dev DB)
- No direct entity exposure in APIs — DTOs generated from the OpenAPI spec are the contract
- REST only (no GraphQL/RPC)
- Spring Security + JWT bearer auth; the intent is **preview/read-only mode for unauthenticated users**, but `SecurityConfiguration` currently permits each public GET route individually (e.g. `GET /api/v1/model-definitions`) rather than a blanket "all GETs open" rule — new read-only endpoints must be added explicitly to the permit list, and everything else defaults to `authenticated()`
- Timestamps: prefer `Instant` / `TIMESTAMP WITH TIME ZONE` columns for new entities
- Presigned R2 URLs for all file uploads/downloads/deletes (frontend talks to R2 directly, never proxies bytes through the backend)

### Frontend
- TypeScript strict mode
- Mantine UI components + Tabler icons (migrated off MUI) — do not reintroduce MUI
- API types/client are generated from the backend OpenAPI spec — do not hand-write duplicate types; regenerate instead
- Structure: `src/components/` (shared UI, e.g. `AppLayout.tsx`, `CollectionCard.tsx`, `ModelCard.tsx`), `src/pages/` (route-level pages), `src/auth/`, `src/generated/` (OpenAPI output, do not hand-edit)

### Database
- snake_case columns, UUID IDs
- Foreign keys with CASCADE/SET NULL as appropriate
- `flyway_schema_history` plus all app tables must persist across container restarts — if tables disappear after `docker compose down`, check for a stray `-v`/volume prune rather than assuming Flyway is misconfigured

---

## Authentication & Security

**Strategy:** Google OAuth only, no passwords, no manual registration.

1. Frontend obtains a Google ID token via Google SSO.
2. `POST /api/v1/auth/google` — backend verifies the Google ID token, checks the email against the `allowed_emails` table, creates/looks up the `User`, and issues an internal JWT.
3. `GET /api/v1/users/me` and all mutating endpoints require `Authorization: Bearer <jwt>`.
4. The intended model is: reads open (preview mode), writes require auth. In practice `SecurityConfiguration` allowlists each public GET route explicitly (currently only `POST /api/v1/auth/google` and `GET /api/v1/model-definitions` are permitted without auth) — everything else, including other GETs, requires a JWT until explicitly added to the permit list. This per-route enumeration is a known rough edge (no wildcard "any GET" rule exists) — be aware of it when adding new read endpoints intended to be public.

R2 presigned URLs are short-lived (minutes, not hours) and scoped per-request; there is no separate rate-limiting or storage-quota layer implemented yet (treat as a future hardening item, not current behavior).

---

## R2 Storage Key Structure

Bucket layout: `<environment>/users/<userId>/models/<modelId>/<imageId>.<ext>`

- One shared R2 bucket per project, partitioned by environment prefix (not separate buckets per user/model).
- The environment prefix comes from an environment variable so each developer can use their own dev namespace (e.g. a per-developer prefix) without clashing with other devs or CI.

---

## Getting Started (Developer)

### Database
```powershell
cd backend
docker compose up -d
```

### Backend
```powershell
cd backend
.\gradlew.bat bootRun
# http://localhost:8080
```
Requires a `.env.local` (gitignored) with Google OAuth client ID/secret, JWT signing secret, and R2 credentials/bucket/environment prefix.

### Frontend
```powershell
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## Testing & Build Commands (verified)

```powershell
cd backend; .\gradlew.bat build     # full backend build + tests
cd frontend; npm run build          # frontend build
cd frontend; npm run lint           # Biome lint
```

There is no frontend test runner configured (no Vitest/RTL) — don't assume frontend unit tests exist or add references to running them.

---

## Known Decisions & Trade-offs

| Decision | Rationale |
|----------|-----------|
| No GraphQL | REST is simpler, fits current scope |
| No microservices | Complexity not warranted at this scale |
| Per-route GET allowlisting instead of blanket "GETs open" | Simpler initial implementation; revisit if the permit-list grows unwieldy |
| Single shared R2 bucket with env/user/model key prefixes | Avoids bucket-per-user/model sprawl and matches Cloudflare R2's bucket-count practicalities |
| One app repo | Simpler to coordinate backend/frontend/API-contract changes together |
| Game-agnostic domain model deferred | Collection + photo management shipped first; rules/army-list domains are future work (see `docs/MODEL.md`) |

---

## Key References

- `docs/MODEL.md` — target/aspirational domain model (explicitly not all implemented yet)
- `backend/src/main/resources/openapi/openapi.yaml` — source of truth for the actual current API surface
- `README.md` — quick start

## Agent Git Policy

- Agents MUST NOT create commits or push changes to the repository without explicit, pre-authorized approval from the repository owner.
- Any code or file changes suggested by an agent should be provided as patches, diff snippets, or draft pull requests and require human review and explicit consent before being committed or pushed.
- This restriction applies to all automated agents, background tasks, and sub-agents operating on the repository.
- If an agent needs a change to be made, it should request approval and provide the exact git commands or a ready-to-apply patch; it must not run those commands itself.
