import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // start vite in the background
  const { exec } = await import('child_process');
  const viteProcess = exec('npm run dev');

  // Wait for vite to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  await page.goto('http://localhost:5173');

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Wait for the login page to appear by waiting for the google button
  try {
    await page.waitForSelector('button.btn-google', { timeout: 10000 });
    console.log("Found Google Login Button");
    await page.click('button.btn-google');
    console.log("Clicked Google Login Button");
  } catch (e) {
    console.error("Could not find Google Login Button", e.message);
    const html = await page.content();
    console.log("HTML:", html.substring(0, 500) + '...');
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  await browser.close();
  viteProcess.kill();
  process.exit(0);
})();
