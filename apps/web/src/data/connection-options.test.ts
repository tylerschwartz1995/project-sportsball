import { expect, it } from "vitest";
import { connectionOptions } from "./connection-options";

it("enforces verified TLS on Neon even with disabling URI options", () => {
  const result = connectionOptions("postgresql://sportsball_web:p@ep-test-pooler.us-west-2.aws.neon.tech/sportsball?sslmode=disable&sslrootcert=bad", true);
  expect(result.ssl).toEqual({ rejectUnauthorized: true });
  expect(result.connectionString).not.toContain("sslmode");
  expect(result.connectionString).not.toContain("sslrootcert");
  expect(result.max).toBe(2);
});
it("rejects accidental local or non-Neon Vercel database credentials", () => {
  expect(() => connectionOptions("postgresql://u:p@localhost/sportsball", true)).toThrow();
  expect(() => connectionOptions("postgresql://ep-test.neon.tech/sportsball", true)).toThrow();
});
it("preserves local development without requiring TLS", () => {
  expect(connectionOptions("postgresql://u:p@localhost/sportsball", false).ssl).toBeUndefined();
});
