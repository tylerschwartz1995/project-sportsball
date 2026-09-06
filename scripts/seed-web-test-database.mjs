import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const { Client } = createRequire(new URL("../apps/web/package.json", import.meta.url))("pg");

const connectionString = process.env.SPORTSBALL_WEB_DATABASE_URL;
if (!connectionString || !new URL(connectionString).pathname.endsWith("_test")) {
  throw new Error("Set SPORTSBALL_WEB_DATABASE_URL to an empty migrated database ending in _test");
}
const client = new Client({ connectionString });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(await readFile(new URL("../database/fixtures/web.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log("Loaded synthetic web fixtures.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
