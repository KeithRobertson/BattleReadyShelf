import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "@/auth/AuthContext";
import { useAuth } from "@/auth/useAuth";
import type { UserDto } from "@/generated";
import { resetApiStubs, stubApi } from "@/testing/stubApi";

const STORED_TOKEN = "header.payload.signature";

const RESTORED_USER: UserDto = {
  id: "b207668f-dbf4-4661-93ce-14db6718d361",
  email: "keith@example.com",
  role: "USER",
};

function SessionProbe() {
  const { isLoading, isAuthenticated, user } = useAuth();
  if (isLoading) return <p>restoring</p>;
  return <p>{isAuthenticated ? `signed in as ${user?.email}` : "signed out"}</p>;
}

function renderWithAuth() {
  render(
    <MantineProvider>
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>
    </MantineProvider>,
  );
}

/**
 * Session restore is the only place allowed to throw a stored token away, so what it does with each
 * kind of failure is the whole difference between "the API blipped" and "you have been logged out".
 */
describe("session restore", () => {
  afterEach(resetApiStubs);

  it("signs the user in from a stored token", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApi({ "/users/me": { status: 200, body: RESTORED_USER } });

    renderWithAuth();

    expect(await screen.findByText("signed in as keith@example.com")).toBeDefined();
    expect(localStorage.getItem("brs_token")).toBe(STORED_TOKEN);
  });

  it("keeps the token when restore fails for a reason other than the token", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApi({ "/users/me": { status: 500, body: { message: "Something went wrong." } } });

    renderWithAuth();

    expect(await screen.findByText("signed out")).toBeDefined();
    expect(localStorage.getItem("brs_token")).toBe(STORED_TOKEN);
  });

  it("discards a token the server rejects as invalid or expired", async () => {
    localStorage.setItem("brs_token", STORED_TOKEN);
    stubApi({ "/users/me": { status: 401, body: { message: "Invalid or expired bearer token." } } });

    renderWithAuth();

    expect(await screen.findByText("signed out")).toBeDefined();
    expect(localStorage.getItem("brs_token")).toBeNull();
  });
});
