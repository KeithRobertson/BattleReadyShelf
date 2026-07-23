# Warhammer Collection Builder - Implementation Plan

## Project Goal

Build a web application that allows users to:

* Manage a collection of Warhammer miniatures.
* Upload and store miniature photos.
* Create reusable collection-based unit templates.
* Build army lists.
* Validate army lists against configurable rules.
* Support future editions, codexes, factions, and game systems.

---

# Guiding Principles

## Keep It Simple

Avoid:

* Microservices
* Event-driven architectures
* Kubernetes
* Multiple repositories
* Premature optimization

Initial goal:

```text
One repository
One Spring Boot application
One PostgreSQL database
One React frontend
```

---

## Data-Driven Rules

Never hardcode:

* Unit points
* Unit sizes
* Keywords
* Duplicate limits

Store all game definitions in database tables.

The backend should validate data, not contain codex rules.

---

## Build Vertical Slices

Avoid implementing every database table first.

Build features end-to-end:

```text
Database
→ Backend
→ Frontend
→ Testing
```

before moving to the next feature.

---

# Target Repository Structure

```text
warhammer-builder/

├── backend/
│
├── frontend/
│
├── database/
│
├── docs/
│
├── .github/
│
├── AGENTS.md
│
└── README.md
```

---

# Phase 0 - Project Setup

## Goal

Establish a deployable foundation.

---

## Backend

Create Spring Boot application.

Dependencies:

* Spring Web
* Spring Data JPA
* Spring Security
* Validation
* Flyway
* PostgreSQL Driver

Packaging:

```text
jar
```

Java Version:

```text
26
```

---

## Frontend

Create React application.

Technology:

* React
* TypeScript
* Vite
* React Router
* Axios

---

## Infrastructure

Create:

```text
GitHub Repository
GitHub Actions
```

Deploy:

```text
Frontend → GitHub Pages
Backend → Local Only
```

Initially.

---

## Deliverables

User can:

* Start frontend
* Start backend
* Connect to local PostgreSQL

---

# Phase 1 - Authentication

## Goal

Create user accounts and login.

---

## Database

Create tables:

```text
users
```

Fields:

```text
id
email
password_hash
display_name
created_at
```

---

## Backend

Implement:

```text
POST /auth/register

POST /auth/login

GET /users/me
```

JWT Authentication.

---

## Frontend

Pages:

```text
Register
Login
Dashboard
```

---

## Deliverables

User can:

* Register
* Login
* Access protected pages

---

# Phase 2 - Game Definition System

## Goal

Model official game data.

This is the foundation of everything else.

---

## Database

Create:

```text
factions

keywords

unit_definitions

unit_keywords

unit_size_profiles
```

---

## Example

Poxwalkers:

```text
Faction:
Death Guard

Keyword:
Battleline

Allowed Sizes:
10
20

Points:
65
130
```

---

## Backend

CRUD APIs:

```text
GET /factions

GET /units

GET /units/{id}
```

Admin APIs:

```text
POST /units

PUT /units

DELETE /units
```

---

## Deliverables

Application understands:

```text
Poxwalkers
Plague Marines
Typhus
```

as game entities.

---

# Phase 3 - Army Builder Core

## Goal

Build legal army lists.

---

## Database

Create:

```text
army_lists

army_list_units
```

---

## Backend

Implement:

```text
POST /army-lists

GET /army-lists

PUT /army-lists/{id}
```

---

## Frontend

Create Army Builder screen.

Features:

* Add unit
* Remove unit
* Save list
* View points

---

## Deliverables

User can build lists.

No validation yet.

---

# Phase 4 - Rules Engine MVP

## Goal

Validate army lists.

---

## Validators

Implement:

### Unit Size

Example:

```text
Poxwalkers
must be
10 or 20
```

---

### Duplicate Units

Example:

```text
3 copies maximum

6 if Battleline
```

---

### Points Total

Example:

```text
2000 points
```

Configurable.

---

## Backend

Create:

```text
RuleEngine
```

with:

```text
ValidationResult
ValidationError
```

---

## Endpoint

```text
POST /army-lists/{id}/validate
```

---

## Deliverables

Lists can be validated.

---

# Phase 5 - Collection Management

## Goal

Track owned miniatures.

---

## Database

Create:

```text
model_definitions

collection_models
```

---

## Example

```text
My Poxwalker #1

My Poxwalker #2

My Poxwalker #3
```

---

## Backend

CRUD APIs.

---

## Frontend

Collection page.

Display:

* Owned models
* Quantities
* Groupings

---

## Deliverables

User can record ownership.

---

# Phase 6 - Collection Unit Templates

## Goal

Create reusable units.

---

## Database

Create:

```text
collection_unit_templates

collection_unit_template_members
```

---

## Example

```text
Painted Poxwalker Horde
```

contains:

```text
10 Poxwalkers
```

---

## Frontend

Allow:

```text
Create Template

Select Models

Save Template
```

---

## Deliverables

User can create reusable squads.

---

# Phase 7 - Image Uploads

## Goal

Store miniature photos.

---

## AWS

Create:

```text
S3 Bucket
```

---

## Database

Create:

```text
model_images
```

---

## Upload Flow

```text
Frontend
→ Request Presigned URL

Backend
→ Validate User

Backend
→ Generate URL

Frontend
→ Upload Directly To S3
```

---

## Protection

Limits:

```text
10 MB max file size

100 uploads per hour

500 MB total storage
```

---

## Deliverables

Users can upload miniature photos.

---

# Phase 8 - Collection-Aware Validation

## Goal

Validate against owned models.

---

## Example

Collection:

```text
15 Poxwalkers
```

List:

```text
20 Poxwalkers
```

Result:

```text
Insufficient owned models
```

---

## Deliverables

Lists can be checked against collection.

---

# Phase 9 - Administration

## Goal

Manage game content.

---

## Admin Features

Manage:

```text
Factions

Keywords

Units

Points

Allowed Sizes
```

---

## Deliverables

No code deployment required for game updates.

---

# Phase 10 - Rules Engine Expansion

## Goal

Support real codex complexity.

---

## Future Rule Types

Examples:

```text
Character Attachments

Detachment Restrictions

Unique Units

Conditional Rules

Allied Units

Faction Restrictions
```

---

## Architecture

Create:

```text
rules

rule_conditions

rule_effects
```

tables.

---

## Deliverables

System supports future codexes.

---

# Phase 11 - Deployment

## Goal

Production deployment.

---

## Frontend

Deploy:

```text
GitHub Pages
```

---

## Backend

Deploy:

```text
AWS ECS Fargate
```

or

```text
Railway
```

for simplicity.

---

## Database

Deploy:

```text
AWS RDS PostgreSQL
```

---

## Storage

Deploy:

```text
AWS S3
```

---

# Phase 12 - Nice-to-Have Features

## AI Recognition

Upload image.

Suggest:

```text
Poxwalker
95%
```

---

## Sharing

Share:

```text
Army Lists

Collections
```

---

## Export

Generate:

```text
TXT
PDF
```

---

## Additional Games

Support:

```text
Age of Sigmar

Kill Team

Horus Heresy
```

through additional game data packs.

---

# Definition of Done (MVP)

The MVP is complete when a user can:

1. Register and login.
2. Record owned miniatures.
3. Upload miniature photos.
4. Create collection unit templates.
5. Build army lists.
6. Validate army lists.
7. Check lists against owned models.
8. Save and load army lists.
9. Use the application from a public URL.
10. Have all data persisted in PostgreSQL and S3.

At this point the platform provides meaningful value to a Warhammer player and forms a stable foundation for future codex, faction, and game system support.
