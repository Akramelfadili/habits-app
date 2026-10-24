// Tests for scripts/check-architecture.mjs. Run with `node --test scripts/`
// (Jest's default testMatch doesn't pick up .mjs files). Each test builds a
// tiny throwaway repo, breaks exactly one rule, and asserts the script exits
// non-zero and names that rule — so a rule can't silently stop working.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"check-architecture.mjs",
);
const roots = [];

/** Builds a throwaway repo from { "src/...": "contents" } and runs the check on it. */
function run(tree, extraArgs = []) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "arch-check-"));
	roots.push(root);
	for (const [file, contents] of Object.entries(tree)) {
		const full = path.join(root, file);
		fs.mkdirSync(path.dirname(full), { recursive: true });
		fs.writeFileSync(full, contents);
	}
	const result = spawnSync(
		process.execPath,
		[SCRIPT, "--root", root, "--allowlist", "none", ...extraArgs],
		{ encoding: "utf8" },
	);
	return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

after(() => {
	for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

const GOOD = {
	"src/modules/habits/repositories/habit-repository.ts": `import { eq } from "drizzle-orm";\nimport { useLiveQuery } from "drizzle-orm/expo-sqlite";\nexport const x = [eq, useLiveQuery];\n`,
	"src/modules/habits/repositories/habit-repository.web.ts":
		"export const x = 1;\n",
	"src/modules/habits/repositories/habit-repository.test.ts": "",
	"src/modules/habits/hooks/use-habit-queries.ts": `import { x } from "../repositories/habit-repository";\nexport function useHabitQueries() { return x; }\n`,
	"src/modules/habits/hooks/use-habit-queries.test.ts": "",
	"src/modules/habits/screens/habit-screen.tsx": `import { useHabitQueries } from "../hooks/use-habit-queries";\nexport const S = useHabitQueries;\n`,
	"src/modules/habits/screens/habit-screen.test.tsx": "",
	"src/app/index.tsx": `import { S } from "@/modules/habits/screens/habit-screen";\nexport default S;\n`,
	"src/theme/theme.ts": `export const ink = "#111111";\nexport const now = new Date(2026, 0, 1);\n`,
	"src/theme/theme.test.ts": "",
};

function expectViolation(files, rule, extraArgs) {
	const { code, out } = run({ ...GOOD, ...files }, extraArgs);
	assert.equal(code, 1, `expected exit 1, got ${code}\n${out}`);
	assert.match(out, new RegExp(`\\[${rule}\\]`), out);
}

describe("check-architecture", () => {
	it("passes on a clean tree", () => {
		const { code, out } = run(GOOD);
		assert.equal(code, 0, out);
	});

	it("drizzle-placement: a hook importing drizzle-orm fails", () => {
		expectViolation(
			{
				"src/modules/habits/hooks/use-bad-queries.ts": `import { eq } from "drizzle-orm";\nexport function useBadQueries() { return eq; }\n`,
				"src/modules/habits/hooks/use-bad-queries.test.ts": "",
			},
			"drizzle-placement",
		);
	});

	it("drizzle-placement: importing the db client outside repositories fails", () => {
		expectViolation(
			{
				"src/modules/habits/services/leak.ts": `import { db } from "@/lib/db/client";\nexport const x = db;\n`,
				"src/modules/habits/services/leak.test.ts": "",
			},
			"drizzle-placement",
		);
	});

	it("drizzle-placement: lib/*/repositories and lib/db are allowed homes", () => {
		const { code, out } = run({
			...GOOD,
			"src/lib/app-settings/repositories/app-settings-repository.ts": `import { eq } from "drizzle-orm";\nexport const x = eq;\n`,
			"src/lib/app-settings/repositories/app-settings-repository.web.ts": "",
			"src/lib/app-settings/repositories/app-settings-repository.test.ts": "",
			"src/lib/db/schema.ts": `import { sql } from "drizzle-orm";\nexport const x = sql;\n`,
		});
		assert.equal(code, 0, out);
	});

	it("live-query-placement: useLiveQuery in a hook fails, but a comment mention doesn't", () => {
		expectViolation(
			{
				"src/modules/habits/hooks/use-bad-queries.ts": `export function useBadQueries() { return useLiveQuery(); }\n`,
				"src/modules/habits/hooks/use-bad-queries.test.ts": "",
			},
			"live-query-placement",
		);
		const { code, out } = run({
			...GOOD,
			"src/modules/habits/hooks/use-ok-queries.ts": `// never call useLiveQuery here\nexport function useOkQueries() { return 1; }\n`,
			"src/modules/habits/hooks/use-ok-queries.test.ts": "",
		});
		assert.equal(code, 0, out);
	});

	it("module-isolation: one module importing another fails", () => {
		expectViolation(
			{
				"src/modules/todos/services/todo-service.ts": `import { x } from "@/modules/habits/repositories/habit-repository";\nexport const y = x;\n`,
				"src/modules/todos/services/todo-service.test.ts": "",
			},
			"module-isolation",
		);
	});

	it("module-isolation: shared code importing a module fails", () => {
		expectViolation(
			{
				"src/components/ui/thing.tsx": `import { S } from "../../modules/habits/screens/habit-screen";\nexport const T = S;\n`,
				"src/components/ui/thing.test.tsx": "",
			},
			"module-isolation",
		);
	});

	it("layer-order: hooks importing from screens fails", () => {
		expectViolation(
			{
				"src/modules/habits/hooks/use-up-queries.ts": `import { S } from "../screens/habit-screen";\nexport function useUpQueries() { return S; }\n`,
				"src/modules/habits/hooks/use-up-queries.test.ts": "",
			},
			"layer-order",
		);
	});

	it("layer-order: dev/ sits with repositories — web twins may import its fixtures, it may not import services", () => {
		const { code, out } = run({
			...GOOD,
			"src/modules/habits/dev/habit-fixtures.ts": "export const rows = [];\n",
			"src/modules/habits/dev/dev-seeds.ts": `import { x } from "../repositories/habit-repository";\nexport const seed = x;\n`,
			"src/modules/habits/dev/dev-seeds.test.ts": "",
			"src/modules/habits/repositories/habit-repository.web.ts": `import { rows } from "../dev/habit-fixtures";\nexport const x = rows;\n`,
		});
		assert.equal(code, 0, out);
		expectViolation(
			{
				"src/modules/habits/services/up-service.ts": "export const y = 1;\n",
				"src/modules/habits/services/up-service.test.ts": "",
				"src/modules/habits/dev/dev-seeds.ts": `import { y } from "../services/up-service";\nexport const seed = y;\n`,
				"src/modules/habits/dev/dev-seeds.test.ts": "",
			},
			"layer-order",
		);
	});

	it("layer-order: presenters sit between services and hooks", () => {
		const { code, out } = run({
			...GOOD,
			"src/modules/habits/services/stats-service.ts": "export const n = 1;\n",
			"src/modules/habits/services/stats-service.test.ts": "",
			"src/modules/habits/presenters/stats-helpers.ts": `import { n } from "../services/stats-service";\nexport const label = n;\n`,
			"src/modules/habits/presenters/stats-helpers.test.ts": "",
			"src/modules/habits/hooks/use-stats-queries.ts": `import { label } from "../presenters/stats-helpers";\nexport function useStatsQueries() { return label; }\n`,
			"src/modules/habits/hooks/use-stats-queries.test.ts": "",
			"src/modules/habits/components/stats-card.tsx": `import { label } from "../presenters/stats-helpers";\nexport const C = label;\n`,
			"src/modules/habits/components/stats-card.test.tsx": "",
		});
		assert.equal(code, 0, out);
		expectViolation(
			{
				"src/modules/habits/presenters/up-helpers.ts": `import { useHabitQueries } from "../hooks/use-habit-queries";\nexport const x = useHabitQueries;\n`,
				"src/modules/habits/presenters/up-helpers.test.ts": "",
			},
			"layer-order",
		);
		expectViolation(
			{
				"src/modules/habits/services/up-service.ts": `import { x } from "../presenters/up-helpers";\nexport const y = x;\n`,
				"src/modules/habits/services/up-service.test.ts": "",
				"src/modules/habits/presenters/up-helpers.ts": "export const x = 1;\n",
				"src/modules/habits/presenters/up-helpers.test.ts": "",
			},
			"layer-order",
		);
	});

	it("layer-order: domain/ is pure — strategies yes, repositories and services no", () => {
		const { code, out } = run({
			...GOOD,
			"src/modules/habits/strategies/daily.ts": "export const s = 1;\n",
			"src/modules/habits/strategies/daily.test.ts": "",
			"src/modules/habits/domain/streaks.ts": `import { s } from "../strategies/daily";\nexport const streak = s;\n`,
			"src/modules/habits/domain/streaks.test.ts": "",
			"src/modules/habits/services/freeze-service.ts": `import { streak } from "../domain/streaks";\nexport const f = streak;\n`,
			"src/modules/habits/services/freeze-service.test.ts": "",
		});
		assert.equal(code, 0, out);
		expectViolation(
			{
				"src/modules/habits/domain/streaks.ts": `import { x } from "../repositories/habit-repository";\nexport const streak = x;\n`,
				"src/modules/habits/domain/streaks.test.ts": "",
			},
			"layer-order",
		);
		expectViolation(
			{
				"src/modules/habits/services/freeze-service.ts":
					"export const f = 1;\n",
				"src/modules/habits/services/freeze-service.test.ts": "",
				"src/modules/habits/domain/streaks.ts": `import { f } from "../services/freeze-service";\nexport const streak = f;\n`,
				"src/modules/habits/domain/streaks.test.ts": "",
			},
			"layer-order",
		);
	});

	it("layer-order: services importing hooks fails", () => {
		expectViolation(
			{
				"src/modules/habits/services/up-service.ts": `import { useHabitQueries } from "../hooks/use-habit-queries";\nexport const x = useHabitQueries;\n`,
				"src/modules/habits/services/up-service.test.ts": "",
			},
			"layer-order",
		);
	});

	it("hook-naming: a misnamed hook file and export fail", () => {
		expectViolation(
			{
				"src/modules/habits/hooks/use-everything.ts": `export function useEverything() { return 1; }\n`,
				"src/modules/habits/hooks/use-everything.test.ts": "",
			},
			"hook-naming",
		);
	});

	it("thin-routes: a fat route and a route importing a hook fail", () => {
		expectViolation(
			{
				"src/app/fat.tsx": `${"// filler\n".repeat(25)}export default function Fat() { return null; }\n`,
			},
			"thin-routes",
		);
		expectViolation(
			{
				"src/app/hooky.tsx": `import { useHabitQueries } from "@/modules/habits/hooks/use-habit-queries";\nimport { x } from "../lib/other";\nexport default useHabitQueries;\n`,
			},
			"thin-routes",
		);
	});

	it("colocated-tests: a source file without a sibling test fails", () => {
		expectViolation(
			{ "src/modules/habits/services/untested.ts": "export const x = 1;\n" },
			"colocated-tests",
		);
	});

	it("web-twin: a repository without a .web.ts twin fails", () => {
		const files = { ...GOOD };
		delete files["src/modules/habits/repositories/habit-repository.web.ts"];
		const { code, out } = run(files);
		assert.equal(code, 1, out);
		assert.match(out, /\[web-twin\]/);
	});

	it("hex-colour: a colour literal outside the theme fails; inside the theme is fine", () => {
		expectViolation(
			{
				"src/components/ui/box.tsx": `export const s = { color: "#ff0000", shadow: "rgba(0,0,0,0.2)" };\n`,
				"src/components/ui/box.test.tsx": "",
			},
			"hex-colour",
		);
	});

	it("date-args: new Date(args) outside theme/utils fails; new Date() and utils are fine", () => {
		expectViolation(
			{
				"src/modules/habits/services/clock.ts": `export const d = new Date(2026, 0, 1);\n`,
				"src/modules/habits/services/clock.test.ts": "",
			},
			"date-args",
		);
		const { code, out } = run({
			...GOOD,
			"src/modules/habits/services/now.ts": `export const d = new Date();\n`,
			"src/modules/habits/services/now.test.ts": "",
			"src/utils/day.ts": `export const d = new Date(2026, 0, 1);\n`,
			"src/utils/day.test.ts": "",
		});
		assert.equal(code, 0, out);
	});

	it("allowlist: a listed violation passes and a stale entry fails", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "arch-check-"));
		roots.push(root);
		const write = (file, contents) => {
			const full = path.join(root, file);
			fs.mkdirSync(path.dirname(full), { recursive: true });
			fs.writeFileSync(full, contents);
		};
		write("src/components/ui/box.tsx", `export const c = "#ff0000";\n`);
		write("src/components/ui/box.test.tsx", "");
		const allowlist = path.join(root, "allow.json");
		fs.writeFileSync(
			allowlist,
			JSON.stringify([
				{ rule: "hex-colour", file: "src/components/ui/box.tsx" },
			]),
		);
		const ok = spawnSync(
			process.execPath,
			[SCRIPT, "--root", root, "--allowlist", allowlist],
			{ encoding: "utf8" },
		);
		assert.equal(ok.status, 0, ok.stdout + ok.stderr);

		// Fix the violation: the entry is now stale and must be removed.
		write("src/components/ui/box.tsx", `export const c = 1;\n`);
		const stale = spawnSync(
			process.execPath,
			[SCRIPT, "--root", root, "--allowlist", allowlist],
			{ encoding: "utf8" },
		);
		assert.equal(stale.status, 1);
		assert.match(stale.stderr, /\[stale\]/);
	});
});
