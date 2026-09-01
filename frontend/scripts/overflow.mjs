/**
 * Reports horizontal overflow for a given scenario.
 *
 * The viewport is pinned without mobile emulation on purpose. Mobile browsers grow the layout
 * viewport to fit overflowing content, which hides the offender - every element then measures as
 * "fitting" against the widened viewport, and fixed-position elements such as modals silently
 * inherit the larger width. Pinning the viewport keeps overflow visible where it happens.
 *
 * Usage: node scripts/overflow.mjs --scenario=wargear-options-editor [--width=320]
 */
import { chromium } from "playwright";
import { mintDevToken } from "./devToken.mjs";
import { SCENARIOS } from "./scenarios.mjs";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:5173";

function parseArgs(argv) {
  const args = { scenario: null, width: 320 };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--scenario=")) args.scenario = arg.slice("--scenario=".length);
    else if (arg.startsWith("--width=")) args.width = Number(arg.slice("--width=".length));
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const scenarios = args.scenario ? SCENARIOS.filter((s) => s.name === args.scenario) : SCENARIOS;
  if (scenarios.length === 0) {
    console.error(`No scenario named "${args.scenario}". Known: ${SCENARIOS.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }

  const token = mintDevToken({
    userId: process.env.SCREENSHOT_USER_ID ?? "b207668f-dbf4-4661-93ce-14db6718d361",
    email: process.env.SCREENSHOT_USER_EMAIL ?? "robertsonk91@gmail.com",
    role: process.env.SCREENSHOT_USER_ROLE ?? "SUPERADMIN",
    roleUpdatedAt: Number(process.env.SCREENSHOT_USER_ROLE_UPDATED_AT ?? 1787324692560),
  });

  const browser = await chromium.launch();
  let failures = 0;

  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: args.width, height: 640 } });
    await context.addInitScript((value) => window.localStorage.setItem("brs_token", value), token);
    const page = await context.newPage();

    try {
      await page.goto(`${BASE_URL}${scenario.route}`, { waitUntil: "networkidle" });
      await scenario.prepare?.(page);
      await page.waitForTimeout(300);

      const report = await page.evaluate(() => {
        const root = document.documentElement;
        const offenders = [];

        for (const element of document.querySelectorAll("body *")) {
          const style = window.getComputedStyle(element);
          // An element that scrolls its own overflow is handling it deliberately, so it is not a bug.
          if (style.overflowX === "auto" || style.overflowX === "scroll") continue;
          if (element.clientWidth < 100) continue;
          if (element.scrollWidth - element.clientWidth <= 2) continue;

          const classes = String(element.className ?? "")
            .split(/\s+/)
            .filter((name) => name && !name.startsWith("m_"))
            .slice(0, 2)
            .join(".");

          offenders.push({
            label: classes ? `${element.tagName.toLowerCase()}.${classes}` : element.tagName.toLowerCase(),
            client: element.clientWidth,
            scroll: element.scrollWidth,
            text: (element.textContent ?? "").trim().slice(0, 40),
          });
        }

        return { documentWidth: root.scrollWidth, viewportWidth: root.clientWidth, offenders };
      });

      const overflowing = report.documentWidth > report.viewportWidth;
      if (overflowing) failures += 1;
      console.log(
        `${overflowing ? "OVERFLOW" : "ok      "}  document=${String(report.documentWidth).padStart(4)}px  ${scenario.name}`,
      );
      if (overflowing) {
        for (const o of report.offenders.slice(0, 8)) {
          console.log(`      ${o.label}  client=${o.client} scroll=${o.scroll}  "${o.text}"`);
        }
      }
    } catch (error) {
      failures += 1;
      console.log(`ERROR     ${scenario.name}: ${String(error).split("\n")[0].slice(0, 100)}`);
    }

    await context.close();
  }

  await browser.close();
  process.exitCode = failures > 0 ? 1 : 0;
}

await main();
