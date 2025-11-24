import { test, expect } from '@playwright/test';
import { loadConfig } from '../config';
import { VaultReader, vaultEnvConfig, vaultDbKeysFromEnv } from '../vault';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

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
