export type AppRoleAuthOptions = {
  address: string;
  roleId: string;
  secretId: string;
  namespace?: string;
  timeoutMs?: number;
};

type FetchFn = typeof fetch;

/**
 * Vault KV client with AppRole authentication. Works for KV v1 and v2.
 */
export class VaultClient {
  private readonly address: string;
  private readonly roleId: string;
  private readonly secretId: string;
  private readonly namespace?: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchFn;

  private token: string | null = null;

  constructor(options: AppRoleAuthOptions, fetchFn: FetchFn = fetch) {
    this.address = options.address.replace(/\/+$/, "");
    this.roleId = options.roleId;
    this.secretId = options.secretId;
    this.namespace = options.namespace;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchFn = fetchFn;
  }

  /**
   * Performs AppRole Authentication and retrieves a client token.
   */
  private async loginWithAppRole(): Promise<void> {
    const url = `${this.address}/v1/auth/approle/login`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.namespace ? { "X-Vault-Namespace": this.namespace } : {}),
        },
        body: JSON.stringify({
          role_id: this.roleId,
          secret_id: this.secretId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Vault AppRole login failed (${response.status}): ${text}`
        );
      }

      const json = await response.json();
      this.token = json?.auth?.client_token;

      if (!this.token) {
        throw new Error("Vault login returned no token.");
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Ensures a valid token exists. If not, login again.
   */
  private async ensureToken(): Promise<void> {
    if (!this.token) {
      await this.loginWithAppRole();
      return;
    }

    // Optional: Add token lookup check and refresh logic
  }

  /**
   * Reads a secret at a given path. Works with KV v1 or v2 response shapes.
   */
  async readSecret(path: string): Promise<Record<string, any>> {
    await this.ensureToken();

    const url = `${this.address}/v1/${path.replace(/^\/+/, "")}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          "X-Vault-Token": this.token!,
          ...(this.namespace ? { "X-Vault-Namespace": this.namespace } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Vault read failed (${response.status}): ${text}`);
      }

      const json = await response.json();
      // KV v2 returns { data: { data: {...} } }, KV v1 returns { data: {...} }
      return json?.data?.data ?? json?.data ?? {};
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Helper for KV v2: mount/data/secretPath
   * Example: readKv2("qa-automation", "DB_CREDS/PAPI_E")
   */
  async readKv2(mount: string, secretPath: string): Promise<Record<string, any>> {
    const normalizedMount = mount.replace(/\/+$/, "");
    const normalizedSecret = secretPath.replace(/^\/+/, "");
    return this.readSecret(`${normalizedMount}/data/${normalizedSecret}`);
  }

  /**
   * Helper for KV v1: mount/secretPath
   */
  async readKv1(mount: string, secretPath: string): Promise<Record<string, any>> {
    const normalizedMount = mount.replace(/\/+$/, "");
    const normalizedSecret = secretPath.replace(/^\/+/, "");
    return this.readSecret(`${normalizedMount}/${normalizedSecret}`);
  }
}

/**
 * Loads Vault AppRole environment variables.
 */
export function vaultConfigFromEnv(): AppRoleAuthOptions | null {
  const address =
    process.env.VAULT_ADDR ||
    process.env.VAULT_URL || // Jenkins bazen VAULT_URL verir
    "http://127.0.0.1:8200"; // Fallback: local dev server

  const roleId =
    process.env.VAULT_ROLE_ID ||
    process.env.ROLE_ID || // Jenkins plugin'den gelebilir
    "";

  const secretId =
    process.env.VAULT_SECRET_ID ||
    process.env.SECRET_ID || // Jenkins plugin'den gelebilir
    "";

  return {
    address,
    roleId,
    secretId,
    namespace: process.env.VAULT_NAMESPACE ?? "",
    timeoutMs: Number(process.env.VAULT_TIMEOUT_MS ?? 5000),
  };
}
