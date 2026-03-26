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

  await new Promise(resolve => setTimeout(resolve, 2000));

  const text = await page.evaluate(() => document.body.innerText);
  console.log("BODY:", text.substring(0, 500));

  await browser.close();
  viteProcess.kill();
  process.exit(0);
})();
