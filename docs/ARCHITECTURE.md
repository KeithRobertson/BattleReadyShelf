# Project Architecture Specification

## Project Overview

This project consists of:

* **Frontend:** React (TypeScript)
* **Backend:** Java Spring Boot REST API
* **Database:** AWS RDS (PostgreSQL)
* **Object Storage:** AWS S3
* **Source Control:** GitHub
* **Frontend Hosting:** GitHub Pages
* **Backend Hosting:** AWS (Elastic Beanstalk, ECS Fargate, or EC2)
* **CI/CD:** GitHub Actions

---

# High-Level Architecture

```text
┌─────────────────────┐
│     End Users       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GitHub Pages       │
│  React Frontend     │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│ Spring Boot API     │
│ AWS Hosted Backend  │
└──────┬────────┬─────┘
       │        │
       │        │
       ▼        ▼
┌──────────┐  ┌──────────┐
│ AWS RDS  │  │ AWS S3   │
│PostgreSQL│  │File Store│
└──────────┘  └──────────┘
```

---

# Technology Stack

## Frontend

| Component        | Technology   |
| ---------------- | ------------ |
| Framework        | React        |
| Language         | TypeScript   |
| Build Tool       | Vite         |
| State Management | React Query  |
| Routing          | React Router |
| UI Framework     | Material UI  |
| HTTP Client      | Axios        |
| Hosting          | GitHub Pages |

### Frontend Responsibilities

* User authentication flow
* Application UI
* Form validation
* API communication
* File upload initiation
* Data visualization

---

## Backend

| Component          | Technology        |
| ------------------ |-------------------|
| Language           | Java 26           |
| Framework          | Spring Boot 4     |
| Build Tool         | Gradle            |
| Security           | Spring Security   |
| Authentication     | JWT               |
| ORM                | Spring Data JPA   |
| Database Migration | Flyway            |
| Logging            | SLF4J + Logback   |
| API Documentation  | OpenAPI / Swagger |

### Backend Responsibilities

* Business logic
* Authentication & authorization
* CRUD operations
* File management
* AWS integrations
* Database management
* API validation

---

## Database

### AWS RDS

Recommended engine:

```text
PostgreSQL 18
```

### Example Schema

#### users

```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE
password_hash VARCHAR(255)
first_name VARCHAR(100)
last_name VARCHAR(100)
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### files

```sql
id UUID PRIMARY KEY
user_id UUID
file_name VARCHAR(255)
s3_key VARCHAR(500)
content_type VARCHAR(100)
size BIGINT
created_at TIMESTAMP
```

---

## File Storage

### AWS S3

Bucket structure:

```text
my-app-bucket/
│
├── uploads/
│   ├── users/
│   └── documents/
│
├── images/
│
└── exports/
```

### S3 Usage

Store:

* User uploads
* Images
* Documents
* Generated reports

### Upload Strategy

Preferred approach:

1. Frontend requests upload URL
2. Backend generates pre-signed URL
3. Frontend uploads directly to S3
4. Backend stores metadata in RDS

Benefits:

* Lower backend load
* Better scalability
* Reduced AWS costs

---

# Authentication & Security

## Authentication

JWT-based authentication.

Flow:

```text
User Login
    ↓
Spring Boot validates credentials
    ↓
JWT issued
    ↓
Frontend stores token
    ↓
Token attached to API requests
```

## Authorization

Role-based access control.

Roles:

```text
USER
ADMIN
```

## Security Requirements

* HTTPS only
* Password hashing using BCrypt
* JWT expiration
* Input validation
* CORS restrictions
* Rate limiting
* SQL injection protection
* XSS protection

---

# REST API Design

Base URL:

```text
https://api.example.com/api/v1
```

## Authentication

### Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:

```json
{
  "token": "jwt-token"
}
```

---

## Users

### Get Profile

```http
GET /users/me
```

### Update Profile

```http
PUT /users/me
```

---

## Files

### Request Upload URL

```http
POST /files/upload-url
```

Response:

```json
{
  "uploadUrl": "...",
  "fileKey": "uploads/abc.pdf"
}
```

### List Files

```http
GET /files
```

### Delete File

```http
DELETE /files/{id}
```

---

# Frontend Structure

```text
src/
│
├── api/
├── assets/
├── components/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── types/
├── utils/
│
├── App.tsx
└── main.tsx
```

---

# Backend Structure

```text
src/main/java/com/company/app
│
├── config/
├── controller/
├── dto/
├── entity/
├── exception/
├── repository/
├── security/
├── service/
├── util/
│
└── Application.java
```

---

# Deployment Architecture

## Frontend Deployment

### GitHub Pages

Build command:

```bash
npm run build
```

Deployment branch:

```text
gh-pages
```

URL:

```text
https://username.github.io/project-name
```

---

## Backend Deployment

GitHub Pages cannot host Java applications.

Recommended AWS options:

### Option 1 (Recommended)

AWS ECS Fargate

Benefits:

* Containerized
* Scalable
* Managed infrastructure

### Option 2

AWS Elastic Beanstalk

Benefits:

* Simpler setup
* Spring Boot friendly

### Option 3

EC2

Benefits:

* Full control
* Lowest abstraction

---

# Infrastructure

## AWS Resources

### Networking

```text
VPC
├── Public Subnet
├── Private Subnet
└── Security Groups
```

### Services

```text
AWS RDS PostgreSQL
AWS S3
AWS Secrets Manager
AWS CloudWatch
AWS ECS Fargate
AWS Route53
AWS ACM
```

---

# Environment Variables

## Backend

```env
SPRING_PROFILES_ACTIVE=prod

DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

S3_BUCKET_NAME=

JWT_SECRET=
JWT_EXPIRATION=
```

## Frontend

```env
VITE_API_BASE_URL=https://api.example.com/api/v1
```

---

# CI/CD Pipeline

## Frontend Workflow

Trigger:

```text
Push to main
```

Steps:

1. Install dependencies
2. Run tests
3. Build React app
4. Deploy to GitHub Pages

---

## Backend Workflow

Trigger:

```text
Push to main
```

Steps:

1. Run unit tests
2. Build Maven package
3. Build Docker image
4. Push image to ECR
5. Deploy to ECS

---

# Monitoring

## Logging

Backend:

```text
Spring Boot
CloudWatch Logs
```

Frontend:

```text
Browser Logging
Sentry (optional)
```

## Metrics

Monitor:

* API latency
* Error rates
* Database performance
* S3 usage
* CPU & memory

---

# Non-Functional Requirements

## Performance

* API response < 500ms average
* Page load < 2 seconds
* Support 1,000+ concurrent users

## Availability

```text
99.9% uptime
```

## Scalability

* Horizontal backend scaling
* S3 unlimited object storage
* RDS vertical scaling

---

# Future Enhancements

* OAuth2 (Google, GitHub)
* Multi-factor authentication
* Redis caching
* Event-driven architecture using SQS
* CloudFront CDN
* Terraform infrastructure-as-code
* Kubernetes (EKS)
* Automated backups
* Blue/Green deployments

---

# Recommended Initial MVP

Phase 1:

* React frontend
* Spring Boot backend
* JWT authentication
* PostgreSQL on RDS
* S3 uploads
* GitHub Actions CI/CD
* GitHub Pages frontend deployment
* ECS Fargate backend deployment

This provides a production-ready architecture with a clean separation between presentation, business logic, persistence, and storage layers while remaining relatively simple to operate.
