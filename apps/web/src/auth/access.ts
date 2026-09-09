/** Vercel production AND previews always require authentication. */
export function privateAccessRequired(): boolean {
  return process.env.VERCEL === "1" || process.env.SPORTSBALL_PRIVATE_ACCESS === "true";
}

export function authConfiguration() {
  const emails = (process.env.SPORTSBALL_ALLOWED_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase());
  const secret = process.env.NEON_AUTH_COOKIE_SECRET ?? "";
  const baseUrl = new URL(process.env.NEON_AUTH_BASE_URL ?? "");
  const origin = new URL(process.env.SPORTSBALL_AUTH_ORIGIN ?? "");
  const local = process.env.VERCEL !== "1" && origin.hostname === "localhost";
  const validEmail = (value: string) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value);
  if (emails.length !== 2 || new Set(emails).size !== 2 || !emails.every(validEmail)
    || secret.length < 32 || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash
    || (origin.protocol !== "https:" && !(local && origin.protocol === "http:"))
    || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash
    || !((baseUrl.protocol === "https:" && baseUrl.hostname.endsWith(".neon.tech"))
      || (local && baseUrl.protocol === "http:" && baseUrl.hostname === "localhost"))) {
    throw new Error("Invalid authentication configuration");
  }
  return { emails, secret, baseUrl: baseUrl.toString(), origin: origin.origin };
}

export function allowedUser(user: unknown, emails: string[]): boolean {
  if (!user || typeof user !== "object") return false;
  const value = user as Record<string, unknown>;
  return value.emailVerified === true && typeof value.email === "string"
    && emails.includes(value.email.toLowerCase());
}
