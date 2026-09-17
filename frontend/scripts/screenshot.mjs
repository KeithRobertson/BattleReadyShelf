/**
 * Mobile/responsive screenshot harness.
 *
 * Renders real pages at real device viewports against the running dev servers and writes PNGs to
 * .screenshots/, so responsive problems can be seen rather than guessed at from the JSX.
 *
 * Prerequisites: the Vite dev server and the backend both running, and a user in the local
 * database (see SCREENSHOT_USER_* below).
 *
 * Usage:
 *   node scripts/screenshot.mjs                        # every scenario, every device
 *   node scripts/screenshot.mjs --scenario=wargear     # one scenario
 *   node scripts/screenshot.mjs --device="iPhone SE"   # one device
 *   node scripts/screenshot.mjs --headed               # watch it drive the browser
 *   node scripts/screenshot.mjs --scenario=X --explore # leave it open to click around in
 *
 * Scenarios live in scripts/scenarios.mjs.
 */
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import { mintDevToken } from "./devToken.mjs";
import { SCENARIOS } from "./scenarios.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(HERE, "..", ".screenshots");

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:5173";

/**
 * Viewports worth checking. 320 is the narrowest phone still in real use and is where layouts
 * break first; the iPhone SE size is the common tight case; iPad Mini catches the tablet
 * breakpoint. Playwright's descriptors carry the right device pixel ratio and touch flags too.
 */
/**
 * Console noise that says nothing about the app: the analytics beacon in index.html has no CORS
 * headers for localhost, and every page load complains about it twice.
 */
const IGNORED_CONSOLE_ERRORS = [/cloudflareinsights\.com/, /net::ERR_FAILED/];

const DEVICE_PRESETS = {
  "Galaxy S III": { ...devices["Galaxy S III"] },
  "iPhone SE": { ...devices["iPhone SE"] },
  "iPad Mini": { ...devices["iPad Mini"] },
  Desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

function parseArgs(argv) {
  const args = { scenario: null, device: null, headed: false, explore: false };
  for (const arg of argv.slice(2)) {
    if (arg === "--headed") args.headed = true;
    else if (arg === "--explore") args.explore = true;
    else if (arg.startsWith("--scenario=")) args.scenario = arg.slice("--scenario=".length);
    else if (arg.startsWith("--device=")) args.device = arg.slice("--device=".length);
  }
  return args;
}

/**
 * Fails chosen API calls so error handling can be photographed. The request is answered in the
 * browser, so nothing in the database has to be broken to produce the error, and a scenario can
 * pick a status the backend would be hard to talk into returning on demand.
 *
 * A failure without a `method` fails every verb on that URL; with one, other verbs fall through to
 * the real backend so the page can still load. `header` narrows it further, to requests carrying a
 * particular header - which is how the app's own token check can be failed without also failing the
 * session restore on the same URL.
 */
async function failApiRoutes(page, failures) {
  for (const failure of failures) {
    await page.route(failure.url, (route) => {
      if (failure.method && route.request().method() !== failure.method) return route.fallback();
      if (failure.header && !route.request().headers()[failure.header]) return route.fallback();
      return route.fulfill({
        status: failure.status,
        contentType: "application/json",
        body: JSON.stringify({ message: failure.message }),
      });
    });
  }
}

function devUser() {
  const roleUpdatedAt = process.env.SCREENSHOT_USER_ROLE_UPDATED_AT;
  return {
    userId: process.env.SCREENSHOT_USER_ID ?? "b207668f-dbf4-4661-93ce-14db6718d361",
    email: process.env.SCREENSHOT_USER_EMAIL ?? "robertsonk91@gmail.com",
    role: process.env.SCREENSHOT_USER_ROLE ?? "SUPERADMIN",
    roleUpdatedAt: roleUpdatedAt ? Number(roleUpdatedAt) : 1787324692560,
  };
}

async function capture(browser, deviceName, scenario, token) {
  const context = await browser.newContext(DEVICE_PRESETS[deviceName]);

  // Seeded before any app code runs, so the very first render is already authenticated and we
  // never see the logged-out shell.
  await context.addInitScript((value) => window.localStorage.setItem("brs_token", value), token);

  const page = await context.newPage();
  if (scenario.failApi) await failApiRoutes(page, scenario.failApi);

  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !IGNORED_CONSOLE_ERRORS.some((noise) => noise.test(message.text()))) {
      consoleErrors.push(message.text());
    }
  });

  const slug = `${scenario.name}--${deviceName.replace(/\s+/g, "-")}`;
  try {
    await page.goto(`${BASE_URL}${scenario.route}`, { waitUntil: "networkidle" });
    await scenario.prepare?.(page);

    const path = resolve(OUTPUT_DIR, `${slug}.png`);
    await page.screenshot({ path, fullPage: scenario.fullPage ?? false });

    // A render loop still screenshots perfectly well, so nothing else here would notice one - and an
    // error state is where they hide, because a query with no data hands out a new empty array on
    // every render. Failing on the warning is the only thing that catches it.
    const loop = consoleErrors.find((text) => text.includes("Maximum update depth exceeded"));
    if (loop) throw new Error("React render loop: Maximum update depth exceeded");

    console.log(`  ok   ${slug}`);
    if (consoleErrors.length > 0) {
      console.log(`       (${consoleErrors.length} console error(s): ${consoleErrors[0].slice(0, 120)})`);
    }
  } catch (error) {
    // A failure here is usually a changed selector rather than a broken page, so capture whatever
    // is on screen: the screenshot normally shows immediately what the script was waiting for.
    const path = resolve(OUTPUT_DIR, `${slug}--FAILED.png`);
    await page.screenshot({ path }).catch(() => {});
    console.log(`  FAIL ${slug}: ${error.message.split("\n")[0]}`);
  } finally {
    await context.close();
  }
}

/**
 * Sets a scenario up and then hands the browser over, so its state can be clicked around in rather
 * than only photographed. The script stays alive until the window is closed.
 *
 * For open-ended poking about, the dev panel in the app itself (bottom left, dev builds only) does
 * the same fault injection without a script; this is for starting from a scenario that already
 * exists.
 */
async function explore(browser, deviceName, scenario, token) {
  // A real resizable window where nothing is being emulated, but the preset's fixed viewport when a
  // device is, since that emulation is the only reason to name one.
  const context = await browser.newContext(
    deviceName === "Desktop" ? { viewport: null } : DEVICE_PRESETS[deviceName],
  );
  await context.addInitScript((value) => window.localStorage.setItem("brs_token", value), token);

  const page = await context.newPage();
  if (scenario.failApi) await failApiRoutes(page, scenario.failApi);

  await page.goto(`${BASE_URL}${scenario.route}`, { waitUntil: "networkidle" });
  // A scenario's prepare is what reaches the interesting state, but it is written for a screenshot
  // and may wait for something this run has not produced. Losing it should not close the window.
  await scenario.prepare?.(page).catch((error) => {
    console.log(`  prepare stopped early: ${error.message.split("\n")[0]}`);
  });

  console.log(`\n"${scenario.name}" is open on ${deviceName}. Close the tab to finish.`);
  if (scenario.failApi) {
    console.log(`Faked: ${scenario.failApi.map((f) => `${f.method ?? "ANY"} ${f.url}`).join(", ")}`);
  }
  await page.waitForEvent("close", { timeout: 0 }).catch(() => {});
}

async function main() {
  const args = parseArgs(process.argv);

  const scenarios = args.scenario ? SCENARIOS.filter((s) => s.name === args.scenario) : SCENARIOS;
  if (scenarios.length === 0) {
    console.error(`No scenario named "${args.scenario}". Known: ${SCENARIOS.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }

  const deviceNames = args.device ? [args.device] : Object.keys(DEVICE_PRESETS);
  const unknownDevice = deviceNames.find((name) => !DEVICE_PRESETS[name]);
  if (unknownDevice) {
    console.error(`No device "${unknownDevice}". Known: ${Object.keys(DEVICE_PRESETS).join(", ")}`);
    process.exit(1);
  }

  if (args.explore) {
    if (scenarios.length > 1) {
      console.error("--explore opens one scenario at a time, so it needs --scenario=<name>.");
      process.exit(1);
    }
    const browser = await chromium.launch({ headless: false });
    try {
      await explore(browser, args.device ?? "Desktop", scenarios[0], mintDevToken(devUser()));
    } finally {
      await browser.close();
    }
    return;
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const token = mintDevToken(devUser());
  const browser = await chromium.launch({ headless: !args.headed });
  try {
    for (const scenario of scenarios) {
      console.log(scenario.name);
      for (const deviceName of deviceNames) {
        await capture(browser, deviceName, scenario, token);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nWrote screenshots to ${OUTPUT_DIR}`);
}

await main();
