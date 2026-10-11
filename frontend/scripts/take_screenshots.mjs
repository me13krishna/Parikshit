import { chromium } from "playwright";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = path.resolve(__dirname, "../../docs/images/ui");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) return true;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function main() {
  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    shell: true,
  });

  try {
    await waitForServer(BASE_URL);
    console.log(`Server is ready at ${BASE_URL}`);

    const browser = await chromium.launch({ headless: true });

    const viewports = [
      { name: "1280", width: 1280, height: 900 },
      { name: "360", width: 360, height: 800 },
    ];

    const stages = [
      { tab: "ingest", filename: "overview" },
      { tab: "mentor", filename: "understand-mentor" },
      { tab: "tasks", filename: "change-tasks" },
      { tab: "battle", filename: "challenge-battle" },
      { tab: "twin", filename: "verify-twin" },
      { tab: "ledger", filename: "prove-ledger" },
    ];

    for (const vp of viewports) {
      console.log(`Capturing viewports at ${vp.width}x${vp.height}...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();

      // Load initial Overview
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      for (const st of stages) {
        // If not already on ingest, click the corresponding tab
        if (st.tab !== "ingest") {
          // Find button matching stage
          const selector = `nav[aria-label="Main Navigation"] button:has-text("${
            st.tab === "mentor"
              ? "Understand"
              : st.tab === "tasks"
              ? "Change"
              : st.tab === "battle"
              ? "Challenge"
              : st.tab === "twin"
              ? "Verify"
              : "Prove"
          }")`;

          const mobileSelector = `nav[aria-label="Mobile Bottom Navigation"] button:has-text("${
            st.tab === "mentor"
              ? "Understand"
              : st.tab === "tasks"
              ? "Change"
              : st.tab === "battle"
              ? "Challenge"
              : st.tab === "twin"
              ? "Verify"
              : "Prove"
          }")`;

          if (vp.width >= 768) {
            await page.click(selector).catch(() => {});
          } else {
            await page.click(mobileSelector).catch(() => {});
          }
          await page.waitForTimeout(350);
        }

        const outPath = path.join(OUT_DIR, `${st.filename}-${vp.name}.png`);
        await page.screenshot({ path: outPath });
        console.log(`Saved screenshot: ${path.basename(outPath)}`);
      }

      // Capture Command Palette on 1280px
      if (vp.name === "1280") {
        await page.keyboard.press("Control+k");
        await page.waitForTimeout(300);
        const cpPath = path.join(OUT_DIR, `command-palette-1280.png`);
        await page.screenshot({ path: cpPath });
        console.log(`Saved screenshot: command-palette-1280.png`);
        await page.keyboard.press("Escape");
      }

      await context.close();
    }

    await browser.close();
    console.log(`\nAll screenshots saved successfully to ${OUT_DIR}`);
  } finally {
    console.log("Shutting down local Next.js server...");
    // Kill the spawned process
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", server.pid.toString(), "/f", "/t"]);
    } else {
      server.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
