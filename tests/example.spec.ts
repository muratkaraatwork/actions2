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

  if (!isJenkins) {
    // LOCAL ÇALIŞMA
    const { DB_USER, DB_PASSWORD } = await loadConfig();
    console.log("Local .env values:");
    console.log("User:", DB_USER);
    console.log("Password:", DB_PASSWORD);
    return;
  }

  // JENKINS ÇALIŞIYOR → VAULT'TAN OKU
  console.log("Jenkins detected. Reading secrets from Vault...");

  const vaultOptions = vaultEnvConfig();
  const dbKeys = vaultDbKeysFromEnv(); 

  if (!vaultOptions || !dbKeys) {
    throw new Error("Vault config environment variables missing!");
  }

  const vault = new VaultReader(vaultOptions);

  const username = await vault.readSecret(dbKeys.path, dbKeys.userKey);
  const password = await vault.readSecret(dbKeys.path, dbKeys.passwordKey);

  console.log("Vault credentials:");
  console.log("User:", username);
  console.log("Password:", password);
});
