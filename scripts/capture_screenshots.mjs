import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // Try live URL first, fall back to localhost:3000
  const targetUrl = 'https://parikshit-six.vercel.app/';
  console.log(`Navigating to ${targetUrl}...`);
  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log('Falling back to http://localhost:3000 due to:', e.message);
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  }

  await new Promise(r => setTimeout(r, 2000));

  const outDir = path.resolve(__dirname, '..', 'docs', 'images', 'ui');
  const cockpitPath = path.join(outDir, 'mvp-cockpit-live.png');
  await page.screenshot({ path: cockpitPath, fullPage: false });
  console.log(`Captured ${cockpitPath}`);

  // Click on "Load Demo Calculator" if available
  try {
    const demoBtn = await page.$('button[title*="calculator"], button:has-text("Load Demo Calculator")');
    if (demoBtn) {
      await demoBtn.click();
      await new Promise(r => setTimeout(r, 3000));
      const demoPath = path.join(outDir, 'mvp-demo-loaded.png');
      await page.screenshot({ path: demoPath, fullPage: false });
      console.log(`Captured ${demoPath}`);
    }
  } catch (err) {
    console.log('Error clicking demo button:', err.message);
  }

  await browser.close();
  console.log('Done capturing screenshots!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
