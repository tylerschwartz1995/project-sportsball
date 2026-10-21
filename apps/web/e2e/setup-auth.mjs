import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
const url = process.env.SPORTSBALL_WEB_DATABASE_URL;
if (process.env.SPORTSBALL_RUN_WEB_FIXTURE_TESTS !== '1' || !url || (!new URL(url).pathname.endsWith('_test') || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))) throw new Error('An isolated fixture database ending in _test is required');
const pool = new Pool({ connectionString: url });
try { await pool.query(await readFile(new URL('../auth/schema.sql', import.meta.url), 'utf8')); }
finally { await pool.end(); }
