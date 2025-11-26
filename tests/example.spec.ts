import { test, expect } from '@playwright/test';
import { loadConfig } from '../config';
import config from '../config.json'

test('has title', async ({ page }) => {
  const url = config['url'];
  await page.goto(url);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
   const url = config['url'];
   await page.goto(url);

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();

  
});

test('get credentials ', async () => {
 const isJenkins = !!process.env.JENKINS_URL;

  if (isJenkins) {
    console.log("Jenkins detected. Reading secrets from Vault...");

    console.log("DB_USER:", process.env.DB_USER);
    console.log("DB_PASSWORD:", process.env.DB_PASSWORD);

    expect(process.env.DB_USER).toBeTruthy();
    expect(process.env.DB_PASSWORD).toBeTruthy();

  } else {
    console.log("Local detected. Reading secrets from .env");

    const { DB_USER, DB_PASSWORD } = await loadConfig();

    console.log("Local DB_USER:", DB_USER);
    console.log("Local DB_PASSWORD:", DB_PASSWORD);
  }
});

test('get credentialsTwo ', async () => {
  console.log(`get credentials two is running`)
 const config = loadConfig();
 const DB_PASSWORD = (await config).DB_PASSWORD;
 const DB_USER = (await config).DB_USER;
  console.log("DB_USER:----------------------", DB_USER);
  console.log("DB_PASSWORD:-------------------", DB_PASSWORD);
});

test('get credentials from vault', async () => {
  console.log(`get credentials from vault is running`);
});
