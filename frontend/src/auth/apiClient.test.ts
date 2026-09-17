import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/auth/apiClient";
import { subscribeApiErrors } from "@/auth/apiErrorEvents";
import { authenticateWithGoogle, getArmyCollections, getCurrentUser } from "@/generated";
import { resetApiStubs, stubApi, stubApiAsAborted, stubApiAsUnreachable } from "@/testing/stubApi";

const STORED_TOKEN = "header.payload.signature";

const VALID_SESSION = { "/users/me": { status: 200, body: { id: "user-1", email: "keith@example.com" } } };
const REJECTED_SESSION = { "/users/me": { status: 401, body: { message: "Invalid or expired bearer token." } } };

/**
 * The rule these cover: an API failure is a message, not a logout. The single exception is a token
 * the server has confirmed it no longer accepts.
 */
describe("API error handling", () => {
  let published: string[] = [];
  let unsubscribe = () => {};

  beforeEach(() => {
    published = [];
    unsubscribe = subscribeApiErrors((message) => published.push(message));
  });

  afterEach(() => {
    unsubscribe();
    resetApiStubs();
  });

  const reported = (...messages: string[]) => vi.waitFor(() => expect(published).toEqual(messages));

  it("surfaces the server's message and keeps the token when a request fails", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApi({ "/army-collections": { status: 500, body: { message: "Something went wrong." } } });

    await expect(getArmyCollections({ throwOnError: true })).rejects.toBeDefined();

    await reported("Something went wrong.");
    expect(localStorage.getItem("brs_token")).toBe(STORED_TOKEN);
  });

  it("explains an unreachable server rather than showing the raw axios error", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApiAsUnreachable();

    await expect(getArmyCollections({ throwOnError: true })).rejects.toBeDefined();

    await reported("Could not reach the server. Check your connection and try again.");
    expect(localStorage.getItem("brs_token")).toBe(STORED_TOKEN);
  });

  it("keeps the session when a 401 turns out not to be the token", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApi({
      "/army-collections": { status: 401, body: { message: "A valid bearer token is required." } },
      ...VALID_SESSION,
    });

    await expect(getArmyCollections({ throwOnError: true })).rejects.toBeDefined();

    await reported("A valid bearer token is required.");
    expect(localStorage.getItem("brs_token")).toBe(STORED_TOKEN);
  });

  it("ends the session when a mid-session 401 is confirmed to be an expired token", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApi({
      "/army-collections": { status: 401, body: { message: "A valid bearer token is required." } },
      ...REJECTED_SESSION,
    });

    await expect(getArmyCollections({ throwOnError: true })).rejects.toBeDefined();

    await reported("Your session has expired. Please sign in again.");
    expect(localStorage.getItem("brs_token")).toBeNull();
  });

  it("checks the token once however many requests fail together", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    const requests = stubApi({
      "/army-collections": { status: 401, body: { message: "A valid bearer token is required." } },
      ...VALID_SESSION,
    });

    await Promise.allSettled([
      getArmyCollections({ throwOnError: true }),
      getArmyCollections({ throwOnError: true }),
      getArmyCollections({ throwOnError: true }),
    ]);

    await vi.waitFor(() => expect(published).toHaveLength(3));
    expect(requests.filter((request) => request.url.includes("/users/me"))).toHaveLength(1);
  });

  it("leaves a 401 from session restore to AuthContext", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApi(REJECTED_SESSION);

    await expect(getCurrentUser({ throwOnError: true })).rejects.toBeDefined();

    expect(published).toEqual([]);
  });

  it("stays quiet when a signed-out visitor requests a protected route", async () => {
    stubApi({ "/army-collections": { status: 401, body: { message: "A valid bearer token is required." } } });

    await expect(getArmyCollections({ throwOnError: true })).rejects.toBeDefined();

    expect(published).toEqual([]);
  });

  it("reports a failed Google login even though there is no token yet", async () => {
    stubApi({ "/auth/google": { status: 401, body: { message: "Invalid or expired Google ID token." } } });

    await expect(
      authenticateWithGoogle({ body: { idToken: "not-a-real-token" }, throwOnError: true }),
    ).rejects.toBeDefined();

    await reported("Invalid or expired Google ID token.");
  });

  it("ignores aborted requests", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApiAsAborted();

    await expect(getArmyCollections({ throwOnError: true })).rejects.toBeDefined();

    expect(published).toEqual([]);
  });
});
