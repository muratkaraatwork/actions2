import { config as dotenvConfig } from "dotenv";
import { VaultReader, vaultEnvConfig, vaultDbKeysFromEnv } from "./vault";

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

  // VAULT ENV değişkenlerini oku
  const vaultOptions = vaultEnvConfig();
  const dbKeys = vaultDbKeysFromEnv();

  if (!vaultOptions || !dbKeys) {
    throw new Error("Vault config missing (VAULT_ADDR, VAULT_TOKEN, VAULT_DB_PATH).");
  }

  // Vault reader oluştur
  const reader = new VaultReader(vaultOptions);

  // Vault içinden secretları oku
  const DB_USER = await reader.readSecret(dbKeys.path, dbKeys.userKey);
  const DB_PASSWORD = await reader.readSecret(dbKeys.path, dbKeys.passwordKey);

  return {
    DB_USER,
    DB_PASSWORD,
  };
}