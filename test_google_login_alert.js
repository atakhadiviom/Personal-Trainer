import { chromium } from 'playwright';
import { exec } from 'child_process';
import fs from 'fs';

// Patch Login.jsx to log the full error
const loginFile = 'src/components/Auth/Login.jsx';
const originalLogin = fs.readFileSync(loginFile, 'utf8');
const patchedLogin = originalLogin.replace(/setError\(err.message.*\);/g, "setError(err.message); console.error('FULL_ERR:', err);");
fs.writeFileSync(loginFile, patchedLogin);

(async () => {
  const viteProcess = exec('npm run dev');
  // Wait for vite to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.text().includes('FULL_ERR:')) {
      console.log('PAGE LOG:', msg.text());
    }
  });

  await page.goto('http://localhost:5173');

  try {
    await page.waitForSelector('button.btn-google', { timeout: 10000 });
    console.log("Found Google Login Button");
    await page.click('button.btn-google');
    console.log("Clicked Google Login Button");

    // wait for alert
    await page.waitForSelector('.alert-warning', { timeout: 5000 });
    const text = await page.locator('.alert-warning').innerText();
    console.log("ALERT TEXT:", text);
  } catch (e) {
    console.error("Error/Timeout:", e.message);
  }

  await browser.close();
  viteProcess.kill();

  // Restore Login.jsx
  fs.writeFileSync(loginFile, originalLogin);
  process.exit(0);
})();
