export type VaultClientOptions = {
  address: string;
  token: string;
  namespace?: string;
  timeoutMs?: number;
};

type FetchFn = typeof fetch;

/**
 * Minimal HashiCorp Vault KV v2 reader using the HTTP API and built-in fetch.
 * Keeps dependencies out while letting the framework source secrets securely.
 */
export class VaultReader {
  private readonly address: string;
  private readonly token: string;
  private readonly namespace?: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchFn;

  constructor(options: VaultClientOptions, fetchFn: FetchFn = fetch) {
    this.address = options.address.replace(/\/+$/, "");
    this.token = options.token;
    this.namespace = options.namespace;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchFn = fetchFn;
  }

  async readSecret(path: string, key: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url = `${this.address}/v1/${path.replace(/^\/+/, "")}`;
      const response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          "X-Vault-Token": this.token,
          ...(this.namespace ? { "X-Vault-Namespace": this.namespace } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Vault returned ${response.status} ${response.statusText}: ${text}`
        );
      }

      const data = await response.json();
      const value =
        data?.data?.data?.[key] ?? // KV v2 shape
        data?.data?.[key]; // KV v1 shape

      if (value === undefined) {
        throw new Error(`Key "${key}" not found at path "${path}"`);
      }

      return value;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Timed out reading Vault path "${path}"`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function vaultEnvConfig() {
  const address = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;
  const namespace = process.env.VAULT_NAMESPACE;

  if (!address || !token) {
    return null;
  }

  return {
    address,
    token,
    namespace,
    timeoutMs: Number(process.env.VAULT_TIMEOUT_MS ?? 5000),
  } satisfies VaultClientOptions;
}

export type VaultDbKeys = {
  path: string;
  userKey: string;
  passwordKey: string;
  hostKey?: string;
  portKey?: string;
  sidKey?: string;
};

export function vaultDbKeysFromEnv(): VaultDbKeys | null {
  const path = process.env.VAULT_DB_PATH;
  if (!path) return null;

  return {
    path,
    userKey: process.env.VAULT_DB_USER_KEY ?? "username",
    passwordKey: process.env.VAULT_DB_PASSWORD_KEY ?? "password",
    hostKey: process.env.VAULT_DB_HOST_KEY ?? "host",
    portKey: process.env.VAULT_DB_PORT_KEY ?? "port",
    sidKey: process.env.VAULT_DB_SID_KEY ?? "sid",
  };
}
