import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);

type Login = { username: string; salt: string; hash: string };

/** Vercel production AND previews always require authentication. */
export function privateAccessRequired(): boolean {
  return process.env.VERCEL === "1" || process.env.SPORTSBALL_PRIVATE_ACCESS === "true";
}

function configuredLogins(): Login[] {
  const users: unknown = JSON.parse(process.env.SPORTSBALL_LOGIN_USERS ?? "null");
  if (!Array.isArray(users) || users.length !== 2) throw new Error("Private access is not configured");
  const valid = users.every((user) => user && typeof user.username === "string"
    && /^[A-Za-z0-9_-]{1,64}$/.test(user.username)
    && typeof user.salt === "string" && /^[a-f0-9]{32}$/.test(user.salt)
    && typeof user.hash === "string" && /^[a-f0-9]{128}$/.test(user.hash));
  if (!valid || users[0].username === users[1].username) throw new Error("Invalid private access configuration");
  return users as Login[];
}

export async function checkLogin(header: string | null): Promise<"allowed" | "denied" | "unconfigured"> {
  let users: Login[];
  try { users = configuredLogins(); } catch { return "unconfigured"; }
  if (!header || header.length > 2048 || !/^Basic [A-Za-z0-9+/]+={0,2}$/i.test(header)) return "denied";
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 1) return "denied";
  const user = users.find((candidate) => candidate.username === decoded.slice(0, separator));
  const password = decoded.slice(separator + 1);
  if (!user || !password || password.length > 512) return "denied";
  const key = await deriveKey(password, Buffer.from(user.salt, "hex"), 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(user.hash, "hex")) ? "allowed" : "denied";
}
