export type AppRoleAuthOptions = {
  address: string;
  roleId: string;
  secretId: string;
  namespace?: string;
  timeoutMs?: number;
};

type FetchFn = typeof fetch;

/**
 * Vault KV v2 reader with AppRole authentication.
 * Uses native fetch and no external dependencies.
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
   * Reads a KV v2 secret at a given path.
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
        throw new Error(
          `Vault read failed (${response.status}): ${text}`
        );
      }

      const json = await response.json();
      return json?.data?.data ?? json?.data ?? {};
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Loads Vault AppRole environment variables.
 */
export function vaultConfigFromEnv(): AppRoleAuthOptions | null {
  const address =
    process.env.VAULT_ADDR ||
    process.env.VAULT_URL ||                    // Jenkins bazen VAULT_URL verir
    "http://127.0.0.1:8200";                    // Fallback → ENSURE NOT NULL

  const roleId =
    process.env.VAULT_ROLE_ID ||
    process.env.ROLE_ID ||                      // Jenkins plugin’den gelebilir
    "";

  const secretId =
    process.env.VAULT_SECRET_ID ||
    process.env.SECRET_ID ||                    // Jenkins plugin’den gelebilir
    "";

  return {
    address,
    roleId,
    secretId,
    namespace: process.env.VAULT_NAMESPACE ?? "",
    timeoutMs: Number(process.env.VAULT_TIMEOUT_MS ?? 5000),
  };
}