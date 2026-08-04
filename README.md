# BattleReadyShelf

A web app for tabletop wargaming hobbyists to manage a photographed miniature collection and build army lists. See [AGENTS.md](AGENTS.md) for full project context (stack, conventions, domain model summary) and [docs/MODEL.md](docs/MODEL.md) for the target domain model.

## Stack

- **Backend:** Spring Boot 4 / Java 26, PostgreSQL (Flyway migrations), Google OAuth + JWT, Cloudflare R2 (S3-compatible) for images.
- **Frontend:** React + TypeScript + Vite, Mantine UI + Tabler icons, OpenAPI-generated client.

## Running locally

### Database

```bash
cd backend
docker compose up -d
```

### Backend

```bash
cd backend
./gradlew bootRun
# http://localhost:8080
```

Requires a `.env.local` (gitignored) with Google OAuth, JWT, and R2 credentials — ask a maintainer or see `backend/src/main/resources/application*.yml` for the expected keys.

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

## Testing

```bash
cd backend && ./gradlew test
cd frontend && npm run lint
```
