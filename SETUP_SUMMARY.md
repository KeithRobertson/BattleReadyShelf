# Setup Summary - Key Updates

## 🎯 Updated Requirements

### Testing Framework
- ✅ **JUnit 6**
- ✅ **AssertJ** for assertions
- ✅ **Mockito** for mocking
- Min 70% code coverage for services

### Authentication Strategy
- ✅ **Google OAuth 2.0 only** (no email/password)
- ✅ **No user registration** endpoint
- ✅ **Zero password management** (Google handles it)
- ✅ Extract email from OAuth token, validate against allowlist

### S3 Cost Protection (Critical)
User can only upload images as initial sole user:

1. **Email Allowlist** 
   - Database table: `allowed_emails`
   - Only your email(s) initially
   - Easy to add more without code changes

2. **Rate Limiting**
   - Max 100 uploads/hour per user
   - Resets hourly
   - Returns 429 if exceeded

3. **File Size Caps**
   - Max 10 MB per file
   - Max 500 MB per user total
   - Checked at presigned URL request time

4. **Monitoring**
   - Log all upload attempts
   - Track per-user storage
   - Emergency disable flag (`storage.uploads.enabled`)

5. **Short-Lived URLs**
   - Presigned URLs valid for 15 minutes only
   - Cannot be reused after expiry
   - S3 validates signature on upload

---

## 📋 Phase 1 Updated

**Phase 1: Authentication & Google OAuth Setup**

Replaces manual registration/login with:
- Google OAuth 2.0 integration (Spring Security OAuth)
- Email allowlist configuration (DB table)
- JWT issued from validated Google tokens
- Protected endpoints require JWT + email check
- `POST /api/v1/auth/google` – Accept Google token
- `GET /api/v1/users/me` – Get user profile

---

## 🚀 Next Steps

1. **Scaffold backend with Spring Security + OAuth 2.0 dependency**
   - `spring-boot-starter-oauth2-client`
   - `spring-boot-starter-security`

2. **Create Google OAuth app**
   - Register at Google Cloud Console
   - Get Client ID & Secret
   - Configure redirect URIs (localhost for dev, GitHub Pages URL for prod)

3. **Database: Create `allowed_emails` table**
   ```sql
   CREATE TABLE allowed_emails (
     email VARCHAR(255) PRIMARY KEY,
     added_at TIMESTAMP DEFAULT NOW()
   );
   INSERT INTO allowed_emails (email) VALUES ('your-email@gmail.com');
   ```

4. **Implement email allowlist check**
   - Custom `@ValidEmail` annotation or service
   - Called after OAuth token validation
   - Throw `ForbiddenException` if not in allowlist

5. **Implement upload rate limiting**
   - Use ConcurrentHashMap or Redis
   - Track per-user upload count
   - Reset on hourly boundary

6. **Test with Google OAuth sandbox**
   - Use test Google account
   - Verify JWT issuance flow
   - Verify allowlist enforcement

---

## 🔒 Security Checklist

- [ ] Google OAuth credentials stored in environment variables (never committed)
- [ ] Email allowlist checked on all S3 presigned URL requests
- [ ] Presigned URLs have 15-minute TTL
- [ ] File size validated before URL generation
- [ ] Rate limits enforced per user, per hour
- [ ] All upload attempts logged with user + timestamp
- [ ] No plaintext secrets in code
- [ ] HTTPS only for production
- [ ] CORS configured for frontend domain

---

## 📝 AGENTS.md Updated

Full updated context now in `AGENTS.md`:
- Google OAuth flow detailed
- S3 cost protection layers documented
- Email allowlist strategy explained
- Updated API endpoints
- Testing requirements clarified
- Phase 1 rewritten for OAuth

**AGENTS.md is now your single source of truth for project context.**
