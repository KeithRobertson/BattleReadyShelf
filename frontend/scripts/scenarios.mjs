/**
 * Scenarios for the screenshot harness.
 *
 * A scenario is a route plus whatever clicking is needed to reach the UI state worth looking at.
 * Modals are component state rather than routes, so they can only be reached by driving the page.
 *
 * Prefer role/name selectors over CSS classes and bare text: Mantine's generated class names change
 * between versions, and `getByText` matches every ancestor containing the string, which in a long
 * page means a strict-mode violation rather than the one node you wanted.
 *
 * A scenario can also set `failApi` to make chosen API calls fail, which is how the error states are
 * reached. Those scenarios double as regression checks: anything a `prepare` waits for that never
 * arrives is reported as a FAIL rather than a screenshot.
 */

/** A collection with enough models to be worth photographing. Override for a different fixture. */
const COLLECTION_ID = process.env.SCREENSHOT_COLLECTION_ID ?? "e3d9900a-fb2b-4bf4-a002-3abe263e7718";

/** Mantine animates modals in; settle before capturing so nothing is caught mid-transition. */
async function settle(page) {
  await page.waitForTimeout(350);
}

/** Opens a modal by clicking the named button and waiting for the dialog to actually be up. */
async function openModal(page, buttonName) {
  await page.getByRole("button", { name: buttonName }).first().click();
  await page.getByRole("dialog").waitFor();
  await settle(page);
}

/**
 * Opens the model definition editor modal and scrolls to a section within it.
 *
 * The Edit buttons live inside a collapsed faction group, so one has to be opened first - the page
 * cannot be relied on to have an open draft sitting at the top, and clicking Edit on a published
 * definition starts one, which is how an admin gets here anyway. "Open drafts" is rendered above
 * "Published" when it is there at all, so the group and the Edit button are both taken from the end
 * to land in the published list either way.
 *
 * The modal scrolls internally, so the section has to be scrolled into view before the screenshot
 * or the interesting part is simply below the fold.
 */
async function openDefinitionEditorAt(page, sectionHeading) {
  await page.getByRole("button", { name: /^Death Guard/ }).last().click();
  await settle(page);
  await page.getByRole("button", { name: /^Edit$/ }).last().click();
  await page.getByRole("dialog").waitFor();
  await settle(page);

  const heading = page.getByRole("dialog").getByRole("heading", { name: sectionHeading, exact: true });
  await heading.waitFor();
  await heading.scrollIntoViewIfNeeded();
  await settle(page);
}

/** Waits for an error message to be on screen, whichever alert ends up showing it. */
async function expectMessage(page, message) {
  await page.getByText(message).first().waitFor();
}

/**
 * Guards the regression that made API errors so annoying: a failed request used to clear the JWT,
 * so the header fell back to the Google button and the user had to sign in again.
 */
async function expectStillSignedIn(page) {
  const signInButton = page.getByRole("button", { name: /sign in with google/i });
  if ((await signInButton.count()) > 0) {
    throw new Error("the API error signed the user out - the Google sign-in button is showing");
  }
}

export const SCENARIOS = [
  // --- Collections -------------------------------------------------------------------------
  {
    name: "collections",
    route: "/collections",
    fullPage: true,
  },
  {
    name: "collections-create-modal",
    route: "/collections",
    prepare: (page) => openModal(page, "Create collection"),
  },
  {
    name: "collections-public",
    route: "/collections/public",
    fullPage: true,
  },
  {
    name: "collection-detail",
    route: `/collections/${COLLECTION_ID}`,
    fullPage: true,
  },

  // --- My definitions ----------------------------------------------------------------------
  {
    name: "my-model-definitions",
    route: "/my/model-definitions",
    fullPage: true,
  },
  {
    name: "my-factions",
    route: "/my/factions",
    fullPage: true,
  },
  {
    name: "my-factions-create-modal",
    route: "/my/factions",
    prepare: (page) => openModal(page, "Create your own"),
  },
  {
    name: "my-wargear-definitions",
    route: "/my/wargear-definitions",
    fullPage: true,
  },
  {
    name: "my-wargear-create-modal",
    route: "/my/wargear-definitions",
    prepare: (page) => openModal(page, "Add your own"),
  },

  // --- Admin -------------------------------------------------------------------------------
  {
    name: "admin-model-definitions",
    route: "/admin/model-definitions",
    fullPage: true,
  },
  {
    /**
     * The originally reported problem: the wargear options rows put a picker, a slot multi-select,
     * a checkbox and a delete button on one non-wrapping row.
     */
    name: "wargear-options-editor",
    route: "/admin/model-definitions",
    prepare: (page) => openDefinitionEditorAt(page, "Wargear options"),
  },
  {
    name: "attachment-slots-editor",
    route: "/admin/model-definitions",
    prepare: (page) => openDefinitionEditorAt(page, "Attachment slots"),
  },
  {
    name: "admin-faction-definitions",
    route: "/admin/faction-definitions",
    fullPage: true,
  },
  {
    name: "admin-wargear-definitions",
    route: "/admin/wargear-definitions",
    fullPage: true,
  },
  {
    name: "admin-users",
    route: "/admin/users",
    fullPage: true,
  },

  // --- Everything else ---------------------------------------------------------------------
  {
    name: "army-builder",
    route: "/army-builder",
    fullPage: true,
  },
  {
    name: "settings",
    route: "/settings",
    fullPage: true,
  },
  {
    name: "not-found",
    route: "/no-such-page",
    fullPage: true,
  },
  // --- Error handling ----------------------------------------------------------------------
  {
    /** A read that fails: the list cannot be shown, but the session and the shell survive. */
    name: "collections-read-error",
    route: "/collections",
    failApi: [
      {
        url: "**/api/v1/army-collections",
        method: "GET",
        status: 500,
        message: "The collections service is unavailable.",
      },
    ],
    prepare: async (page) => {
      await expectMessage(page, "The collections service is unavailable.");
      await expectStillSignedIn(page);
      await settle(page);
    },
  },
  {
    /**
     * A write that fails. The create mutation ignores its own error, so before the global banner
     * existed this failed silently: the modal just sat there having done nothing.
     */
    name: "collections-create-error",
    route: "/collections",
    failApi: [
      {
        url: "**/api/v1/army-collections",
        method: "POST",
        status: 409,
        message: "You already have a collection with that name.",
      },
    ],
    prepare: async (page) => {
      await openModal(page, "Create collection");
      await page.getByRole("textbox", { name: "Name" }).fill("Ultramarines");
      await page.getByRole("button", { name: "Create", exact: true }).click();
      await expectMessage(page, "You already have a collection with that name.");
      await expectStillSignedIn(page);
      await settle(page);
    },
  },
  {
    /**
     * The token itself being rejected is the one case that *should* end the session, so this is the
     * inverse check: the sign-in button is expected back, and quietly, with no error to explain.
     */
    name: "collections-expired-token",
    route: "/collections",
    failApi: [{ url: "**/api/v1/users/me", status: 401, message: "Invalid or expired bearer token." }],
    prepare: async (page) => {
      await page.getByRole("button", { name: /sign in with google/i }).waitFor();
      await settle(page);
    },
  },
  {
    /**
     * A token that expires part way through a visit: it was good enough to sign in with, so only the
     * app's own token re-check is failed here, which is the one carrying `x-session-check`.
     */
    name: "collections-session-expired",
    route: "/collections",
    failApi: [
      {
        url: "**/api/v1/army-collections",
        method: "GET",
        status: 401,
        message: "A valid bearer token is required.",
      },
      {
        url: "**/api/v1/users/me",
        header: "x-session-check",
        status: 401,
        message: "Invalid or expired bearer token.",
      },
    ],
    prepare: async (page) => {
      await expectMessage(page, "Your session has expired. Please sign in again.");
      await page.getByRole("button", { name: /sign in with google/i }).waitFor();
      await settle(page);
    },
  },

  {
    /**
     * An admin list that will not load. The page has to say so structurally: an empty table with no
     * explanation reads as "there is nothing here", which is a different and wrong statement.
     */
    name: "admin-read-error",
    route: "/admin/model-definitions",
    failApi: [
      {
        url: "**/api/v1/admin/model-definitions",
        method: "GET",
        status: 503,
        message: "The definitions service is unavailable.",
      },
    ],
    prepare: async (page) => {
      await expectMessage(page, "The model definitions could not be loaded. Reload the page to try again.");
      await expectMessage(page, "The definitions service is unavailable.");
      await expectStillSignedIn(page);
      await settle(page);
    },
  },
  {
    /**
     * The one failure the API layer cannot report, because the file never reaches the API: an import
     * of something that is not JSON.
     */
    name: "admin-import-bad-file",
    route: "/admin/faction-definitions",
    prepare: async (page) => {
      await page.getByRole("button", { name: "Import" }).click();
      await page.locator('input[type="file"]').setInputFiles({
        name: "not-really.json",
        mimeType: "application/json",
        buffer: Buffer.from("this is not json"),
      });
      await expectMessage(page, "That file is not valid JSON, so there was nothing to import.");
      await settle(page);
    },
  },
  {
    /**
     * A refused delete. The row used to disappear anyway, because the mutation treated the error
     * response as a success, so the model looked deleted until the next reload brought it back.
     */
    name: "collection-delete-error",
    route: `/collections/${COLLECTION_ID}`,
    failApi: [
      {
        url: "**/api/v1/collection-models/*",
        method: "DELETE",
        status: 409,
        message: "This model is used by an army list and cannot be deleted.",
      },
    ],
    prepare: async (page) => {
      // Mantine's SegmentedControl keeps the real radio off-screen, so the label is what can be
      // clicked.
      await page.locator("label").filter({ hasText: /^Edit$/ }).click();

      await page.getByText("Biologus Putrifier", { exact: true }).first().click();
      await settle(page);

      const deleteModel = page.getByRole("button", { name: "Delete model" }).first();
      await deleteModel.scrollIntoViewIfNeeded();
      await deleteModel.click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
      await expectMessage(page, "This model is used by an army list and cannot be deleted.");
      await expectStillSignedIn(page);
      await settle(page);
    },
  },

  {
    name: "navigation-open",
    route: "/collections",
    /** The burger nav is the only way around on a phone, so it is worth checking on its own. */
    prepare: async (page) => {
      await page.getByRole("button", { name: /toggle navigation/i }).click();
      await settle(page);
    },
  },
];
