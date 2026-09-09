import type { PoolConfig } from "pg";

export function connectionOptions(value: string, hosted = process.env.VERCEL === "1"): PoolConfig {
  const url = new URL(value);
  const neon = url.hostname.endsWith(".neon.tech");
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Expected PostgreSQL URL");
  if (hosted && (!neon || url.username !== "sportsball_web" || !url.password)) throw new Error("Vercel requires Neon database credentials");
  if (neon) {
    const supported = new Set(["sslmode", "sslrootcert", "sslcert", "sslkey", "sslpassword", "uselibpqcompat", "channel_binding"]);
    if ([...url.searchParams.keys()].some(key => !supported.has(key))) throw new Error("Unsupported Neon connection option");
    // pg connection-string SSL parameters override its explicit ssl object.
    // Remove them and enforce certificate + hostname verification ourselves.
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("ssl") || key === "uselibpqcompat") url.searchParams.delete(key);
    }
  }
  return {
    connectionString: url.toString(),
    ...(neon ? { ssl: { rejectUnauthorized: true }, statement_timeout: undefined } : {}),
    max: neon ? 2 : 10,
    connectionTimeoutMillis: neon ? 15_000 : 5_000,
    idleTimeoutMillis: neon ? 10_000 : 30_000,
    allowExitOnIdle: neon,
  };
}
