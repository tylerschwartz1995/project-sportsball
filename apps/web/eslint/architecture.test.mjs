import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import path from "node:path";
import { dependencyDirection } from "./architecture.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
const sourceRoot = path.resolve(import.meta.dirname, "../src");
const file = name => path.join(sourceRoot, name);
new RuleTester().run("dependency-direction", dependencyDirection, {
  valid: [
    { filename: file("app/drafts/page.tsx"), code: 'import { view } from "@/features/drafts/board";' },
    { filename: file("data/games.ts"), code: 'import { query } from "./database";' },
    { filename: file("components/ui/table.tsx"), code: 'import { format } from "@/lib/directory";' },
    { filename: file("features/drafts/view.tsx"), code: 'import { Table } from "@/components/ui/table";' },
  ],
  invalid: [
    { filename: file("contracts/game.ts"), code: 'import { query } from "../data/database";' },
    { filename: file("lib/format.ts"), code: 'export * from "@/features/drafts/board";' },
    { filename: file("components/ui/table.tsx"), code: 'import { view } from "../../features/drafts/board";' },
    { filename: file("features/drafts/view.tsx"), code: 'import("@/app/drafts/page");' },
    { filename: file("app/page.tsx"), code: 'import { Pool } from "pg";' },
    { filename: file("app/page.tsx"), code: 'const db = require("../data/database");' },
  ].map(test => ({ ...test, errors: [{ messageId: "boundary" }] })),
});
