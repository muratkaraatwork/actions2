import { config as dotenvConfig } from "dotenv";
import { VaultClient, vaultConfigFromEnv } from "../actions2/vault";

export async function loadConfig() {
  const isJenkins = !!process.env.JENKINS_URL;

  // Jenkins değilse -> .env dosyasını oku
  if (!isJenkins) {
    dotenvConfig();
    return {
      DB_USER: process.env.DB_USER!,
      DB_PASSWORD: process.env.DB_PASSWORD!,
    };
  }

  console.log("Jenkins ortamı — credentials Vault’tan okunacak.");

 const cfg = vaultConfigFromEnv();
  const vault = new VaultClient(cfg!);

  const data = await vault.readSecret("qa-automation/data/DB_CREDS/PAPI_E");

  console.log("USER:", data.username);
  console.log("PASS:", data.password);

  // Vault içinden secretları oku
  const DB_USER = data.username;
  const DB_PASSWORD = data.password;

  return {
    DB_USER,
    DB_PASSWORD,
  };
}