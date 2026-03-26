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

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log("All logs:");
  logs.forEach(l => console.log(l));

  await browser.close();
  viteProcess.kill();
  process.exit(0);
})();
