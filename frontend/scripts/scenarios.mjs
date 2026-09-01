/**
 * Scenarios for the screenshot harness.
 *
 * A scenario is a route plus whatever clicking is needed to reach the UI state worth looking at.
 * Modals are component state rather than routes, so they can only be reached by driving the page.
 *
 * Prefer role/name selectors over CSS classes and bare text: Mantine's generated class names change
 * between versions, and `getByText` matches every ancestor containing the string, which in a long
 * page means a strict-mode violation rather than the one node you wanted.
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
 * The modal scrolls internally, so the section has to be scrolled into view before the screenshot
 * or the interesting part is simply below the fold.
 */
async function openDefinitionEditorAt(page, sectionHeading) {
  await openModal(page, /^Edit/);

  const heading = page.getByRole("dialog").getByRole("heading", { name: sectionHeading, exact: true });
  await heading.waitFor();
  await heading.scrollIntoViewIfNeeded();
  await settle(page);
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
