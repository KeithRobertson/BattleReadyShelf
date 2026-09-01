/**
 * Dev-token minting for the screenshot harness.
 *
 * The app authenticates through Google SSO, which cannot be driven headlessly. The token is
 * therefore minted directly and injected into localStorage, which is exactly what a real login
 * ends up doing - see src/auth/tokenStorage.ts.
 *
 * This only ever produces tokens signed with the local development secret, so a token from here is
 * useless against any deployed environment.
 */
import { createHmac } from "node:crypto";

/** Matches the `JWT_SECRET` default in backend/src/main/resources/application.yaml. */
const DEV_SECRET = process.env.JWT_SECRET ?? "local-secret-key-for-development-only";

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

/**
 * Mints an HS256 token with the claims BRS's JwtService expects.
 *
 * `roleUpdatedAt` has to match the user's `role_updated_at` column: the backend compares the two to
 * invalidate tokens issued before a role change, so a mismatch is rejected as unauthorized.
 */
export function mintDevToken({ userId, email, role, roleUpdatedAt, ttlSeconds = 3600 }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: userId,
    email,
    role,
    roleUpdatedAt,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = createHmac("sha256", DEV_SECRET).update(signingInput).digest("base64url");

  return `${signingInput}.${signature}`;
}
