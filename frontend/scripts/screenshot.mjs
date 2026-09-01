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
const DEVICE_PRESETS = {
  "Galaxy S III": { ...devices["Galaxy S III"] },
  "iPhone SE": { ...devices["iPhone SE"] },
  "iPad Mini": { ...devices["iPad Mini"] },
  Desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

function parseArgs(argv) {
  const args = { scenario: null, device: null, headed: false };
  for (const arg of argv.slice(2)) {
    if (arg === "--headed") args.headed = true;
    else if (arg.startsWith("--scenario=")) args.scenario = arg.slice("--scenario=".length);
    else if (arg.startsWith("--device=")) args.device = arg.slice("--device=".length);
  }
  return args;
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
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const slug = `${scenario.name}--${deviceName.replace(/\s+/g, "-")}`;
  try {
    await page.goto(`${BASE_URL}${scenario.route}`, { waitUntil: "networkidle" });
    await scenario.prepare?.(page);

    const path = resolve(OUTPUT_DIR, `${slug}.png`);
    await page.screenshot({ path, fullPage: scenario.fullPage ?? false });
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
