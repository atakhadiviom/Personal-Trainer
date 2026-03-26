import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // start vite in the background
  const { exec } = await import('child_process');
  const viteProcess = exec('npm run dev');

  // Wait for vite to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  const logs = [];
  page.on('console', msg => logs.push(`LOG: ${msg.text()}`));
  page.on('pageerror', err => logs.push(`ERROR: ${err.message}`));

  await page.goto('http://localhost:5173');

  try {
    await page.waitForSelector('button.btn-google', { timeout: 10000 });
    console.log("Found Google Login Button");
    await page.click('button.btn-google');
    console.log("Clicked Google Login Button");
  } catch (e) {
    console.error("Could not find Google Login Button", e.message);
  }

  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log("Logs:", logs);

  // capture screenshot
  await page.screenshot({ path: 'login_error.png' });

  await browser.close();
  viteProcess.kill();
  process.exit(0);
})();
