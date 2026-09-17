import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/auth/apiClient";
import { subscribeApiErrors } from "@/auth/apiErrorEvents";
import { type ApiFault, findFault, newFault, setFaults } from "@/dev/apiFaults";
import { installApiFaults } from "@/dev/installApiFaults";
import { getArmyCollections } from "@/generated";
import { resetApiStubs, stubApi } from "@/testing/stubApi";

const COLLECTIONS = "http://localhost:8080/api/v1/army-collections";

function match(url: string, method = "GET", ...overrides: Partial<ApiFault>[]): ApiFault | undefined {
  return findFault(
    overrides.map((override) => newFault(override)),
    method,
    url,
  );
}

describe("fault matching", () => {
  it("matches a whole path but not what sits underneath it", () => {
    const rule = { url: "**/api/v1/army-collections" };

    expect(match(COLLECTIONS, "GET", rule)).toBeDefined();
    expect(match(`${COLLECTIONS}/8ab1`, "GET", rule)).toBeUndefined();
  });

  it("lets a single star stand in for one path segment", () => {
    const rule = { url: "**/api/v1/collection-models/*" };

    expect(match("http://localhost:8080/api/v1/collection-models/8ab1", "DELETE", rule)).toBeDefined();
    expect(match("http://localhost:8080/api/v1/collection-models/8ab1/images", "DELETE", rule)).toBeUndefined();
  });

  it("ignores the query string, so a rule need not know about parameters", () => {
    expect(match(`${COLLECTIONS}?page=2`, "GET", { url: "**/api/v1/army-collections" })).toBeDefined();
  });

  it("matches a relative URL, which is what the client is given before axios resolves it", () => {
    expect(match("/api/v1/army-collections", "GET", { url: "**/api/v1/army-collections" })).toBeDefined();
  });

  it("applies to one verb when given one, and to every verb otherwise", () => {
    const postOnly = { url: "**/api/v1/**", method: "POST" };

    expect(match(COLLECTIONS, "POST", postOnly)).toBeDefined();
    expect(match(COLLECTIONS, "GET", postOnly)).toBeUndefined();
    expect(match(COLLECTIONS, "GET", { url: "**/api/v1/**" })).toBeDefined();
  });

  it("skips a rule that is switched off", () => {
    expect(match(COLLECTIONS, "GET", { url: "**/api/v1/**", enabled: false })).toBeUndefined();
  });

  it("uses the first matching rule, so an earlier one wins", () => {
    const fault = match(COLLECTIONS, "GET", { url: "**/army-collections", status: 503 }, { url: "**/api/v1/**" });

    expect(fault?.status).toBe(503);
  });
});

/**
 * The reason for injecting at the adapter rather than anywhere higher up: a faulted request has to
 * reach the app's own error handling looking exactly like a real failure, or exploring one tells you
 * nothing about what the app does with it.
 */
describe("fault injection", () => {
  let published: string[] = [];
  let unsubscribe = () => {};

  beforeEach(() => {
    published = [];
    unsubscribe = subscribeApiErrors((message) => published.push(message));
    localStorage.setItem("brs_token", "header.payload.signature");
    // Installed over the stub, so anything the rules do not match still gets an answer.
    stubApi({ "/api/v1": { status: 200, body: [] } });
    installApiFaults();
  });

  afterEach(() => {
    unsubscribe();
    setFaults([]);
    resetApiStubs();
    localStorage.clear();
  });

  it("fails a matching request with the rule's status and message", async () => {
    setFaults([
      newFault({ url: "**/api/v1/army-collections", method: "GET", status: 503, message: "Service unavailable." }),
    ]);

    await expect(getArmyCollections({ throwOnError: true })).rejects.toMatchObject({ response: { status: 503 } });
    await vi.waitFor(() => expect(published).toEqual(["Service unavailable."]));
  });

  it("reports a rule that never answers as a connection problem", async () => {
    setFaults([newFault({ url: "**/api/v1/**", kind: "network" })]);

    await expect(getArmyCollections({ throwOnError: true })).rejects.toMatchObject({ code: "ERR_NETWORK" });
    await vi.waitFor(() =>
      expect(published).toEqual(["Could not reach the server. Check your connection and try again."]),
    );
  });

  it("answers with a body of its own", async () => {
    setFaults([newFault({ url: "**/api/v1/army-collections", kind: "body", body: '[{"name":"Faked"}]' })]);

    const { data } = await getArmyCollections({ throwOnError: true });

    expect(data).toEqual([{ name: "Faked" }]);
    expect(published).toEqual([]);
  });

  it("leaves a request no rule matches alone", async () => {
    setFaults([newFault({ url: "**/api/v1/paints" })]);

    await expect(getArmyCollections({ throwOnError: true })).resolves.toBeDefined();
    expect(published).toEqual([]);
  });
});
