# BattleReadyShelf - Agent Context & Project Guide

## 🎯 Project Vision

**BattleReadyShelf** is a web application for tabletop wargaming enthusiasts to:
- **Manage collections** of painted/owned miniatures with photos
- **Build and validate army lists** for competitive or casual play
- **Support multiple game systems** (initially game-agnostic architecture)
- **Never require code deployment** for game rule updates (rules are data, not code)

The system models three distinct domains: official game rules, user-owned collections, and playable army lists.

---

## 📊 Architecture Overview

```
Frontend (React/TypeScript/Vite)
  ↓ HTTPS
Backend (Spring Boot 4 / Java 26)
  ↓
PostgreSQL (RDS)
AWS S3 (miniature photos)
```

**Key Principle:** One monorepo, one backend, one database. Keep it simple—no microservices, no Kubernetes.

---

## 🔧 Technology Stack

| Layer       | Technology           | Details                           |
|-------------|----------------------|-----------------------------------|
| Frontend    | React + TypeScript   | Vite build, React Router, Axios  |
| Backend     | Spring Boot 4        | Java 26, Google OAuth, JWT       |
| Database    | PostgreSQL           | AWS RDS (production)             |
| Storage     | AWS S3               | Presigned URLs, rate limited     |
| Auth        | Google OAuth 2.0     | Email allowlist, no passwords    |
| Testing     | JUnit 6 + AssertJ    | Mockito for mocking              |
| Migrations  | Flyway               | Versioned schema changes only    |
| Hosting     | GitHub Pages (FE)    | AWS ECS/Fargate (BE)             |
| CI/CD       | GitHub Actions       | Automated builds & deployments   |

---

## 🏗️ Domain Model

### **Rules Domain** (Official Game Data)
- **GameSystem** – "Warhammer 40K", "Age of Sigmar", "Kill Team", etc.
- **Faction** – "Death Guard", "Ultramarines", "Stormcast", etc.
- **ModelDefinition** – A specific miniature type (e.g., "Poxwalker")
- **UnitDefinition** – A datasheet with composition rules (e.g., "Poxwalkers 10-20 models")
- **UnitCompositionRule** – What models may compose a unit
- **WargearDefinition** – Selectable options (e.g., "Plasma Gun")
- **UnitOptionDefinition** – Which wargear is available to which units
- **UnitPointsRule** – Points costs (data-driven, never hardcoded)

### **Collection Domain** (User Ownership)
- **CollectionModel** – One specific miniature I own (e.g., "My Painted Poxwalker #1")
- **CollectionUnitTemplate** – Reusable squad grouping (convenience feature, not game rule)
- **ProxyAssignment** – Using one model to represent another (borrowed/proxy/token)

### **Army Domain** (Playable Lists)
- **ArmyList** – Saved army composition (e.g., "Death Guard 2000pts")
- **ArmyUnit** – A unit selected in a list (snapshot, independent of collection)
- **ArmyUnitModel** – Actual models used in an army unit
- **ArmyUnitAttachment** – Leader/attachment mechanics

**Critical Rule:** Army lists are independent of collection templates once created. Edit a template later won't change existing lists.

---

## 📋 Collapsed MVP (6 Phases → Core Deliverables)

The plan originally had 12 phases. **We're collapsing to 6 to move faster:**

### **Phase 0: Project Setup** ✅
- GitHub repo, GitHub Actions, Spring Boot scaffold, React scaffold
- Local PostgreSQL connectivity verified
- Deploy pipeline: Frontend → GitHub Pages, Backend → Local (initially)

### **Phase 1: Authentication & Google OAuth Setup**
- Google OAuth 2.0 integration (Spring Security OAuth)
- Email allowlist configuration (database table or properties)
- JWT issued from validated Google tokens
- Protected API endpoints require JWT + email allowlist check
- Protected frontend pages (redirect to Google login if not authenticated)
- `POST /api/v1/auth/google`, `GET /api/v1/users/me`
- **No manual registration, no password management**

### **Phase 2: Game Definition System** 
- Data-driven game rules (no hardcoding)
- Admin endpoints to manage: GameSystems, Factions, Units, Points, Wargear
- Admin UI to CRUD game content
- Example: Model "Poxwalker", Unit "Poxwalkers", Points "65/130"

### **Phase 3: Collection Management (Photo Priority)**
- Users can add/remove owned miniatures
- Photo uploads to S3 via presigned URLs
- Collection listing with thumbnail previews
- Start building collection awareness for validation later

### **Phase 4: Army Builder Core**
- Create/edit/delete army lists
- Add units to lists from game definitions
- View points totals
- Basic composition (no strict validation yet)
- Collection-aware UI hints ("You own X, list needs Y")

### **Phase 5: Validation Engine**
- Validate army lists against rules:
  - Unit sizes (min/max models)
  - Unit point costs
  - Duplicate limits
  - Points total constraints
- Validate against owned collection:
  - "Army needs 20 Poxwalkers, you own 15" → Warning
- Return clear validation errors to frontend

**After Phase 5 → MVP is complete.** User can register, manage collection with photos, build validated army lists.

---

## 🎨 Design Rules & Constraints

### **Backend**
- ✅ UUID primary keys on all entities
- ✅ Flyway for all database migrations (versioned, never manual SQL)
- ✅ NO direct entity exposure in APIs
- ✅ DTO (Data Transfer Object) contracts for all API responses/requests
- ✅ REST endpoints only (no GraphQL, no RPC)
- ✅ Unit tests required for business logic
- ✅ Spring Security + JWT for auth
- ✅ Never hardcode game data (use database tables)
- ✅ Presigned S3 URLs for file uploads (frontend → S3 direct)

### **Frontend**
- ✅ TypeScript strict mode
- ✅ React Router for navigation
- ✅ Axios with centralized error handling
- ✅ Component-based architecture
- ✅ Form validation before API calls

### **Database**
- ✅ All timestamps use UTC
- ✅ Consistent naming: snake_case columns, UUID IDs
- ✅ Foreign keys with CASCADE/SET NULL as appropriate
- ✅ Indexes on frequently queried columns (user_id, faction_id, etc.)

---

## 📂 Repository Structure

```
BattleReadyShelf/
├── backend/                    # Spring Boot application
│   ├── src/main/java/
│   │   └── com/battlereadyshelf/
│   │       ├── config/         # Spring configs
│   │       ├── controller/     # REST endpoints
│   │       ├── dto/            # API contracts
│   │       ├── entity/         # JPA entities
│   │       ├── exception/      # Custom exceptions
│   │       ├── repository/     # Data access
│   │       ├── security/       # JWT, auth config
│   │       ├── service/        # Business logic
│   │       └── util/           # Helpers
│   ├── src/test/java/          # Unit tests
│   └── build.gradle
├── frontend/                   # React + TypeScript application
│   ├── src/
│   │   ├── api/               # Axios client
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Page components
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx
│   └── package.json
├── docs/
│   ├── PLAN.md                # Implementation phases
│   ├── ARCHITECTURE.md        # System design
│   └── MODEL.md               # Domain model details
├── AGENTS.md                  # This file
├── README.md                  # Quick start
└── .github/workflows/         # CI/CD pipelines
```

---

## 🔐 Authentication & Security

**Authentication Strategy: Google OAuth Only**
- No email/password authentication
- Google SSO as sole entry point (Spring Security + OAuth 2.0)
- Extract email from OAuth token
- Zero manual user management (no password resets, registration forms, etc.)

**Email Allowlist for MVP Protection:**
- Maintain a `allowed_emails` config or database table
- Only whitelisted emails from Google OAuth can authenticate
- Initially: your email(s) only
- Easy to add emails later without code changes

**S3 Upload Cost Control (Critical):**

1. **Email Allowlist** – Presigned URL endpoint requires authenticated user with whitelisted email
2. **Rate Limiting** – Max 100 uploads per hour per user (Redis or in-memory cache)
3. **File Size Caps** – Max 10 MB per file, 500 MB total storage per user
4. **Authentication Required** – All S3 presigned URL requests must be authenticated & authorized
5. **Monitoring** – Log all uploads with user, file size, timestamp
6. **Easy Disable** – Config flag to disable uploads globally in emergency

**JWT from Google:**
1. POST `/api/v1/auth/google` with Google token
2. Backend validates Google token signature
3. Extract email, check allowlist
4. Issue internal JWT for API requests
5. All subsequent requests require valid JWT

**Security Notes:**
- No user registration endpoint
- No password storage
- Google handles credential security
- Email allowlist prevents unauthorized access
- S3 presigned URLs are short-lived (15 min expiry)

---

## 📡 API Patterns

All endpoints follow RESTful conventions:

```
POST   /api/v1/auth/register        # ❌ REMOVED - Google OAuth only
POST   /api/v1/auth/login            # ❌ REMOVED - Google OAuth only
POST   /api/v1/auth/google           # ✅ NEW - Accept Google OAuth token
GET    /api/v1/users/me              # Authenticated user profile

GET    /api/v1/game-systems          # List game systems
GET    /api/v1/factions              # List factions
GET    /api/v1/units                 # List unit definitions
GET    /api/v1/units/{id}            # Unit detail

POST   /api/v1/collection            # Add owned model
GET    /api/v1/collection            # List owned models
DELETE /api/v1/collection/{id}       # Remove owned model

POST   /api/v1/files/upload-url      # Get S3 presigned URL (AUTH + ALLOWLIST required)
DELETE /api/v1/files/{id}            # Delete file

POST   /api/v1/army-lists            # Create army list
GET    /api/v1/army-lists            # List user's armies
PUT    /api/v1/army-lists/{id}       # Update army
DELETE /api/v1/army-lists/{id}       # Delete army
POST   /api/v1/army-lists/{id}/units # Add unit to list
POST   /api/v1/army-lists/{id}/validate # Validate list
```

All responses follow a standard envelope:
```json
{
  "success": true,
  "data": { /* payload */ },
  "error": null
}
```

---

## 🚀 Getting Started (Developer)

### Backend
```bash
cd backend
./gradlew bootRun
# Runs on http://localhost:8080
# Requires PostgreSQL on localhost:5432
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
# Proxies API to http://localhost:8080
```

### Database (Docker)
```bash
cd backend
docker-compose up
# PostgreSQL on localhost:5432
# psql -U postgres -d battlereadyshelf
```

---

## 🧪 Testing Strategy

- **Backend:** JUnit 6 + AssertJ + Mockito, min 70% code coverage for services
- **Frontend:** Vitest + React Testing Library, focus on critical paths
- **Integration:** Flyway migrations verified, API contracts tested

---

## 💰 S3 Cost Protection Implementation

Since S3 uploads are your primary cost concern, we're implementing **multi-layer protection**:

### **Layer 1: Email Allowlist**
```sql
CREATE TABLE allowed_emails (
  email VARCHAR(255) PRIMARY KEY,
  added_at TIMESTAMP
);
```
- Only authenticated users with whitelisted emails can access S3 endpoints
- Initially: your email(s) only
- Managed via admin API or direct DB update
- No presigned URL generated for unapproved users

### **Layer 2: Rate Limiting (Per-User)**
- **Uploads per hour:** Max 100
- **Implementation:** In-memory counter or Redis
- **Resets hourly**
- **Returns 429 (Too Many Requests) when exceeded**

### **Layer 3: File Size Caps**
- **Per file:** Max 10 MB
- **Per user total:** Max 500 MB
- **Enforcement at presigned URL request time**
- **Verified again at S3 upload completion**

### **Layer 4: Monitoring & Alerts**
- Log all upload attempts: `{user_email, file_size, timestamp, status}`
- Track cumulative storage per user
- Consider adding CloudWatch alerts for:
  - Spike in upload volume
  - User approaching 500 MB quota
  - Any failed authentication to S3 endpoint

### **Layer 5: Emergency Disable**
- Config property: `storage.uploads.enabled` (default: true)
- Set to `false` to block all presigned URL generation
- Doesn't require code redeploy, just config change

### **Presigned URL Flow**
```
Frontend
  ↓ POST /api/v1/files/upload-url
Backend
  1. Verify JWT valid
  2. Check email in allowlist
  3. Check rate limit (uploads/hour)
  4. Check file size < 10 MB
  5. Check user storage < 500 MB
  6. Generate presigned URL (15 min TTL)
  7. Log attempt
  ↓
Frontend receives URL
  ↓ Direct upload to S3
S3 rejects if TTL expired or signature tampered
```

---

## 🎮 Game System Extensibility

From day one, the system is **game-agnostic**:
- GameSystem entity allows "Warhammer 40K", "Age of Sigmar", "Kill Team", etc.
- All rules are data, not code
- Adding a new faction = INSERT rows, not code changes
- Adding a new codex = database updates via admin UI

---

## 🚢 Deployment Timeline

- **MVP (Phase 5):** Frontend → GitHub Pages, Backend → Local/Docker
- **Phase 6+:** Backend → AWS ECS Fargate, Database → AWS RDS, Storage → AWS S3
- **CI/CD:** GitHub Actions auto-build/test on push to main

---

## 📝 Code Quality Standards

- **Formatting:** Gradle spotless (Java), ESLint (TypeScript)
- **Tests:** Required for all new features
- **Commits:** Conventional commits + Copilot co-author trailer
- **PR Reviews:** At least one approval before merge
- **Documentation:** Docstrings on public methods, README updates for new features

---

## ❓ Known Decisions & Trade-offs

| Decision | Rationale |
|----------|-----------|
| No GraphQL | REST is simpler, fits MVP scope |
| No microservices | Complexity not warranted at this scale |
| No event bus | Single DB transactions sufficient for MVP |
| No caching layer | RDS performance adequate initially |
| One app repo | Simpler to coordinate changes |
| Game-agnostic from start | Future-proofs against support requests |
| Collection prioritized over builder | Photos are differentiator, not yet another list builder |

---

## 🔄 Next Steps

1. **Phase 0:** Ensure backend starts, frontend runs, Docker PostgreSQL works
2. **Phase 1:** Auth endpoints complete, login page functional
3. **Phase 2:** Admin UI to add sample game systems & units
4. **Phase 3:** Collection CRUD + S3 upload, photo display
5. **Phase 4:** Army builder UI + unit selection
6. **Phase 5:** Validation engine tested end-to-end

---

## 📚 Key References

- `docs/PLAN.md` – Detailed phase breakdown
- `docs/ARCHITECTURE.md` – Infrastructure and deployment details
- `docs/MODEL.md` – Complete entity relationship diagram and descriptions

## 🤖 Agent Git Policy

- Agents MUST NOT create commits or push changes to the repository without explicit, pre-authorized approval from the repository owner.
- Any code or file changes suggested by an agent should be provided as patches, diff snippets, or draft pull requests and require human review and explicit consent before being committed or pushed.
- This restriction applies to all automated agents, background tasks, and sub-agents operating on the repository.
- If an agent needs a change to be made, it should request approval and provide the exact git commands or a ready-to-apply patch; it must not run those commands itself.
