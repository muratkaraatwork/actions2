import { config as dotenvConfig } from "dotenv";
import { VaultClient, vaultConfigFromEnv } from "./vault";

export async function loadConfig() {
  const isJenkins = !!process.env.JENKINS_URL;
  const envUser = process.env.DB_USER;
  const envPass = process.env.DB_PASSWORD;

  // If env vars already exist (e.g., Jenkins Vault build wrapper), use them.
  if (envUser && envPass) {
    return { DB_USER: envUser, DB_PASSWORD: envPass };
  }

  // Not Jenkins -> read from local .env
  if (!isJenkins) {
    dotenvConfig();
    return {
      DB_USER: process.env.DB_USER!,
      DB_PASSWORD: process.env.DB_PASSWORD!,
    };
  }

  console.log("Jenkins environment -- reading credentials from Vault via AppRole.");

  const cfg = vaultConfigFromEnv();
  if (!cfg?.roleId || !cfg?.secretId) {
    throw new Error("Vault AppRole env vars missing (VAULT_ROLE_ID/VAULT_SECRET_ID).");
  }

  const vault = new VaultClient(cfg);

  const data = await vault.readSecret("qa-automation/data/DB_CREDS/PAPI_E");

  console.log("USER:", data.USER_NAME ?? data.username);
  console.log("PASS:", data.PASSWORD ?? data.password);

  const DB_USER = data.USER_NAME ?? data.username;
  const DB_PASSWORD = data.PASSWORD ?? data.password;

  return {
    DB_USER,
    DB_PASSWORD,
  };
}
