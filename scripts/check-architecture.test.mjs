// Run with `node --test scripts/`: Jest's default testMatch doesn't pick up .mjs files.
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

	it("no-dev-in-ui: UI importing dev/ or bringing back a seed/clear/reset helper fails", () => {
		expectViolation(
			{
				"src/modules/habits/dev/habit-fixtures.ts": "export const rows = [];\n",
				"src/modules/habits/components/dev-card.tsx": `import { rows } from "../dev/habit-fixtures";\nexport const C = rows;\n`,
				"src/modules/habits/components/dev-card.test.tsx": "",
			},
			"no-dev-in-ui",
		);
		expectViolation(
			{
				"src/modules/habits/hooks/use-wipe-actions.ts":
					"export function useWipeActions() { return { clearAllHabits: 1 }; }\n",
				"src/modules/habits/hooks/use-wipe-actions.test.ts": "",
			},
			"no-dev-in-ui",
		);
		expectViolation(
			{
				"src/modules/habits/screens/seed-screen.tsx": `export const label = "Seed (dev)";\n`,
				"src/modules/habits/screens/seed-screen.test.tsx": "",
			},
			"no-dev-in-ui",
		);
	});

	describe("starter-profile-site", () => {
		const SITE = {
			"src/modules/habits/dev/starter-profile.ts": "export const v = 1;\n",
			"src/modules/habits/dev/starter-profile.test.ts": "",
			"src/modules/habits/repositories/starter-profile-repository.ts": `import { v } from "../dev/starter-profile";\nexport const r = v;\n`,
			"src/modules/habits/repositories/starter-profile-repository.web.ts": `import type * as N from "./starter-profile-repository";\nexport type T = typeof N;\n`,
			"src/modules/habits/repositories/starter-profile-repository.test.ts": "",
			"src/modules/habits/services/starter-profile-service.ts": `import { r } from "../repositories/starter-profile-repository";\nexport const s = r;\n`,
			"src/modules/habits/services/starter-profile-service.test.ts": "",
			"src/modules/habits/screens/starter-profile-gate.tsx": `import { s } from "../services/starter-profile-service";\nexport const G = s;\nexport const raw = process.env.EXPO_PUBLIC_STARTER_PROFILE;\n`,
			"src/modules/habits/screens/starter-profile-gate.test.tsx": "",
			"src/app/_layout.tsx": `export const G = __DEV__ ? require("@/modules/habits/screens/starter-profile-gate").G : null;\n`,
		};

		it("passes when only the root layout loads the gate, behind __DEV__", () => {
			const { code, out } = run({ ...GOOD, ...SITE });
			assert.equal(code, 0, out);
		});

		it("fails when the gate is imported anywhere else", () => {
			expectViolation(
				{
					...SITE,
					"src/modules/habits/screens/other-screen.tsx": `import { G } from "./starter-profile-gate";\nexport const O = G;\n`,
					"src/modules/habits/screens/other-screen.test.tsx": "",
				},
				"starter-profile-site",
			);
		});

		it("fails when the service or repository is imported outside their owner", () => {
			expectViolation(
				{
					...SITE,
					"src/modules/habits/hooks/use-seed-actions.ts": `import { s } from "../services/starter-profile-service";\nexport function useSeedActions() { return s; }\n`,
					"src/modules/habits/hooks/use-seed-actions.test.ts": "",
				},
				"starter-profile-site",
			);
			expectViolation(
				{
					...SITE,
					"src/modules/habits/services/other-service.ts": `import { r } from "../repositories/starter-profile-repository";\nexport const o = r;\n`,
					"src/modules/habits/services/other-service.test.ts": "",
				},
				"starter-profile-site",
			);
		});

		it("fails when the root layout imports the gate without __DEV__", () => {
			expectViolation(
				{
					...SITE,
					"src/app/_layout.tsx": `import { G } from "@/modules/habits/screens/starter-profile-gate";\nexport const X = G;\n`,
				},
				"starter-profile-site",
			);
			expectViolation(
				{
					...SITE,
					"src/app/_layout.tsx": `export const G = require("@/modules/habits/screens/starter-profile-gate").G;\n`,
				},
				"starter-profile-site",
			);
		});

		it("fails when the env variable is read outside the gate", () => {
			expectViolation(
				{
					...SITE,
					"src/utils/profile.ts": `export const p = process.env.EXPO_PUBLIC_STARTER_PROFILE;\n`,
					"src/utils/profile.test.ts": "",
				},
				"starter-profile-site",
			);
		});
	});

	it("no-console: raw console.* in src fails, the console sink and tests are fine", () => {
		expectViolation(
			{
				"src/utils/noisy.ts": `export function f() { console.log("x"); }\n`,
				"src/utils/noisy.test.ts": "",
			},
			"no-console",
		);
		const { code, out } = run({
			...GOOD,
			"src/lib/logger/sinks/console-sink.ts": `export const s = () => console.log("x");\n`,
			"src/lib/logger/sinks/console-sink.test.ts": "",
			"src/utils/quiet.ts": `// console.log is not allowed here\nexport const a = 1;\n`,
			"src/utils/quiet.test.ts": `console.log("tests may");\n`,
		});
		assert.equal(code, 0, out);
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

	it("test-support-site: app code importing test-support or the test database fails; test-support itself may use Drizzle and tests may import it", () => {
		expectViolation(
			{
				"src/modules/habits/test-support/loader.ts": `import { eq } from "drizzle-orm";\nexport const load = eq;\n`,
				"src/modules/habits/services/bad-service.ts": `import { load } from "../test-support/loader";\nexport const x = load;\n`,
				"src/modules/habits/services/bad-service.test.ts": "",
			},
			"test-support-site",
		);
		expectViolation(
			{
				"src/lib/db/test-db.ts": "export const createTestDb = 1;\n",
				"src/modules/habits/services/bad-db.ts": `import { createTestDb } from "@/lib/db/test-db";\nexport const x = createTestDb;\n`,
				"src/modules/habits/services/bad-db.test.ts": "",
			},
			"test-support-site",
		);
		const { code, out } = run({
			...GOOD,
			"src/modules/habits/test-support/loader.ts": `import { eq } from "drizzle-orm";\nexport const load = eq;\n`,
			"src/modules/habits/services/ok.test.ts": `import { load } from "../test-support/loader";\n`,
		});
		assert.equal(code, 0, out);
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
