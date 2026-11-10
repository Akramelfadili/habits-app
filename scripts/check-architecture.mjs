#!/usr/bin/env node
// node scripts/check-architecture.mjs [--print-allowlist] [--root <dir> --allowlist <file|none>]
// Allowlist entries may only be removed: a stale entry fails too, so the list can only shrink.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => {
	const i = args.indexOf(name);
	return i === -1 ? undefined : args[i + 1];
};
const ROOT = path.resolve(
	flag("--root") ??
		path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
);
const SRC = path.join(ROOT, "src");
const allowlistArg = flag("--allowlist");
const ALLOWLIST_FILE =
	allowlistArg === "none"
		? null
		: path.resolve(
				allowlistArg ??
					path.join(
						path.dirname(fileURLToPath(import.meta.url)),
						"check-architecture.allowlist.json",
					),
			);

function walk(dir) {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory())
			return entry.name === "node_modules" ? [] : walk(full);
		return [full];
	});
}

const rel = (file) => path.relative(ROOT, file).split(path.sep).join("/");
const isSource = (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".d.ts");
const isTest = (file) => /\.test\.(ts|tsx)$/.test(file);

const files = walk(SRC).filter(isSource);
const productionFiles = files.filter((file) => !isTest(file));

// Keeps line numbers so a mention in a comment isn't a hit.
function stripComments(text) {
	return text
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
		.replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

const sources = new Map(
	files.map((file) => [file, stripComments(fs.readFileSync(file, "utf8"))]),
);

function importsOf(file) {
	const text = sources.get(file);
	const found = [];
	const re =
		/(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
	for (const match of text.matchAll(re)) {
		const line = text.slice(0, match.index).split("\n").length;
		found.push({ spec: match[1], line });
	}
	return found;
}

function resolveImport(file, spec) {
	let target;
	if (spec.startsWith("@/")) target = path.join(SRC, spec.slice(2));
	else if (spec.startsWith("."))
		target = path.resolve(path.dirname(file), spec);
	else return undefined;
	return rel(target);
}

const violations = [];
function report(rule, file, line, message, spec) {
	violations.push({ rule, file: rel(file), line, message, import: spec });
}

const inDir = (file, ...segments) =>
	rel(file).includes(`/${segments.join("/")}/`);

const DRIZZLE_HOMES = [
	/^src\/modules\/[^/]+\/repositories\//,
	/^src\/lib\/[^/]+\/repositories\//,
	/^src\/lib\/db\//,
	// Jest-only helpers; the "test-support-site" rule keeps them out of the app bundle.
	/^src\/(modules\/[^/]+\/)?test-support\//,
];
const inDrizzleHome = (file) => DRIZZLE_HOMES.some((re) => re.test(rel(file)));

for (const file of productionFiles) {
	if (inDrizzleHome(file)) continue;
	for (const { spec, line } of importsOf(file)) {
		if (/^drizzle-(orm|kit)(\/|$)/.test(spec))
			report(
				"drizzle-placement",
				file,
				line,
				`imports "${spec}" outside a repositories/ folder or src/lib/db/`,
				spec,
			);
		else if (/^@\/lib\/db\/(client|schema)$/.test(spec))
			report(
				"drizzle-placement",
				file,
				line,
				`imports "${spec}" outside a repositories/ folder or src/lib/db/`,
				spec,
			);
	}
	const text = sources.get(file);
	for (const match of text.matchAll(/\buseLiveQuery\b/g)) {
		const line = text.slice(0, match.index).split("\n").length;
		report(
			"live-query-placement",
			file,
			line,
			"uses useLiveQuery outside a repositories/ folder — wrap it in a repository-exported hook",
		);
	}
}

// Nothing test-only may reach the production bundle.
const isTestOnly = (relPath) =>
	/(^|\/)test-support(\/|$)/.test(relPath) ||
	/^src\/lib\/db\/(test-db|test-live-query)(\.ts)?$/.test(relPath);
for (const file of productionFiles) {
	if (isTestOnly(rel(file))) continue;
	for (const { spec, line } of importsOf(file)) {
		const target = resolveImport(file, spec);
		if (target && isTestOnly(target))
			report(
				"test-support-site",
				file,
				line,
				`app code imports test-only code (${target}) — test-support/, test-db and test-live-query are for tests only`,
				spec,
			);
	}
}

const moduleOf = (relPath) => relPath.match(/^src\/modules\/([^/]+)\//)?.[1];
for (const file of productionFiles) {
	const own = moduleOf(rel(file));
	const fromApp = rel(file).startsWith("src/app/");
	for (const { spec, line } of importsOf(file)) {
		const target = resolveImport(file, spec);
		if (!target) continue;
		const targetModule = moduleOf(`${target}/`);
		if (!targetModule) continue;
		if (own && targetModule !== own)
			report(
				"module-isolation",
				file,
				line,
				`module "${own}" imports module "${targetModule}"`,
				spec,
			);
		else if (!own && !fromApp)
			report(
				"module-isolation",
				file,
				line,
				`shared code imports module "${targetModule}" — promote the concept to lib/ or shared/ instead`,
				spec,
			);
	}
}

// dev/ sits with repositories because the .web.ts twins read its fixtures; domain/ may use
// strategies but never repositories/ or dev/ (checked below), so it stays testable without a db.
const LAYER_RANK = {
	repositories: 0,
	strategies: 0,
	dev: 0,
	domain: 1,
	services: 2,
	presenters: 3,
	hooks: 4,
	components: 5,
	screens: 6,
};
const DOMAIN_FORBIDDEN = new Set(["repositories", "dev"]);
const layerOf = (relPath) => {
	const m = relPath.match(/^src\/modules\/[^/]+\/([^/]+)\//);
	return m && m[1] in LAYER_RANK ? m[1] : undefined;
};
for (const file of productionFiles) {
	const fromLayer = layerOf(rel(file));
	if (!fromLayer) continue;
	for (const { spec, line } of importsOf(file)) {
		const target = resolveImport(file, spec);
		const toLayer = target && layerOf(`${target}/`);
		if (!toLayer) continue;
		if (LAYER_RANK[toLayer] > LAYER_RANK[fromLayer])
			report(
				"layer-order",
				file,
				line,
				`${fromLayer}/ imports from ${toLayer}/ (upward dependency)`,
				spec,
			);
		else if (fromLayer === "domain" && DOMAIN_FORBIDDEN.has(toLayer))
			report(
				"layer-order",
				file,
				line,
				`domain/ imports from ${toLayer}/ — domain rules stay pure; orchestrate in services/`,
				spec,
			);
	}
}

for (const file of productionFiles) {
	if (!inDir(file, "hooks") || !rel(file).includes("src/modules/")) continue;
	const name = path.basename(file);
	if (!/^use-[a-z0-9-]+-(queries|actions)\.tsx?$/.test(name))
		report(
			"hook-naming",
			file,
			1,
			`hook file "${name}" must be named use-<x>-queries.ts or use-<x>-actions.ts`,
		);
	const text = sources.get(file);
	for (const match of text.matchAll(
		/export\s+(?:async\s+)?function\s+(use\w+)/g,
	)) {
		if (!/(Queries|Actions)$/.test(match[1]))
			report(
				"hook-naming",
				file,
				text.slice(0, match.index).split("\n").length,
				`exported hook "${match[1]}" must end in Queries or Actions`,
			);
	}
}

const ROUTE_IMPORTS = [
	/^@\/modules\//,
	/^@\/components\//,
	/^expo-router/,
	/^react$/,
];
const ROUTE_MAX_LINES = 20;
for (const file of productionFiles) {
	if (!rel(file).startsWith("src/app/")) continue;
	if (path.basename(file) === "_layout.tsx") continue;
	const lines = fs.readFileSync(file, "utf8").split("\n").length;
	if (lines > ROUTE_MAX_LINES)
		report(
			"thin-routes",
			file,
			1,
			`route is ${lines} lines (max ${ROUTE_MAX_LINES}) — move logic into a module screen`,
		);
	for (const { spec, line } of importsOf(file)) {
		if (!ROUTE_IMPORTS.some((re) => re.test(spec)))
			report(
				"thin-routes",
				file,
				line,
				`route imports "${spec}" — routes may only import module screens, shared UI, expo-router and react`,
				spec,
			);
	}
}

const NO_TEST_NEEDED = [
	/^src\/app\//,
	/\/migrations\//,
	/\.web\.tsx?$/,
	/(^|\/)types\.ts$/,
	/(^|\/)constants\.ts$/,
	/-fixtures\.ts$/,
	/\/test-support\//,
	/\/test-db\.ts$/,
	/\/test-live-query\.ts$/,
	/\/keys\.ts$/,
	/\/schema\.ts$/,
];
for (const file of productionFiles) {
	const r = rel(file);
	if (NO_TEST_NEEDED.some((re) => re.test(r))) continue;
	const base = file.replace(/\.tsx?$/, "");
	if (!fs.existsSync(`${base}.test.ts`) && !fs.existsSync(`${base}.test.tsx`))
		report(
			"colocated-tests",
			file,
			1,
			"no colocated .test.ts(x) next to this file",
		);
}

for (const file of productionFiles) {
	const r = rel(file);
	if (!/\/repositories\/[^/]+-repository\.ts$/.test(r)) continue;
	if (!fs.existsSync(file.replace(/\.ts$/, ".web.ts")))
		report(
			"web-twin",
			file,
			1,
			"repository has no .web.ts counterpart — web would crash on import",
		);
}

const COLOUR_LITERAL = /["'`]#[0-9a-fA-F]{3,8}["'`]|\brgba?\(|\boklch\(/g;
const DATE_WITH_ARGS = /\bnew Date\(\s*[^)\s]/g;
for (const file of productionFiles) {
	const r = rel(file);
	const text = sources.get(file);
	if (!r.startsWith("src/theme/")) {
		for (const match of text.matchAll(COLOUR_LITERAL))
			report(
				"hex-colour",
				file,
				text.slice(0, match.index).split("\n").length,
				"colour literal outside src/theme — use a theme token",
			);
	}
	if (!r.startsWith("src/theme/") && !r.startsWith("src/utils/")) {
		for (const match of text.matchAll(DATE_WITH_ARGS))
			report(
				"date-args",
				file,
				text.slice(0, match.index).split("\n").length,
				"new Date(<args>) — use date-fns (rule 7) or a helper in src/utils",
			);
	}
}

const CONSOLE_CALL = /\bconsole\s*\.\s*(log|info|warn|error|debug|trace)\s*\(/g;
const CONSOLE_SINK = "src/lib/logger/sinks/console-sink.ts";
for (const file of productionFiles) {
	const r = rel(file);
	if (r === CONSOLE_SINK || r.startsWith("src/test-support/")) continue;
	const text = sources.get(file);
	for (const match of text.matchAll(CONSOLE_CALL))
		report(
			"no-console",
			file,
			text.slice(0, match.index).split("\n").length,
			`console.${match[1]}() — use log.${match[1] === "log" ? "info" : match[1]}("area.event", fields) from lib/logger (ADR 008); only the console sink may call console`,
		);
}

const UI_DIRS = ["hooks", "components", "screens", "presenters"];
const DEV_ONLY_NAMES =
	/\b(seedStreakAtRiskHabit|seedHabitWithHistory|clearAllHabits|deleteAllHabits|resetFirstRun|createHabitAt)\b|\(dev\)["'`]/g;
for (const file of productionFiles) {
	const r = rel(file);
	const isUi =
		r.startsWith("src/app/") ||
		r.startsWith("src/components/") ||
		UI_DIRS.some((dir) => inDir(file, dir));
	if (isUi) {
		for (const { spec, line } of importsOf(file)) {
			const target = resolveImport(file, spec);
			if (target && /\/dev(\/|$)/.test(target))
				report(
					"no-dev-in-ui",
					file,
					line,
					"UI imports from dev/ — fixtures and device state are for repositories and the dev-state service only",
					spec,
				);
		}
	}
	if (r.includes("/dev/")) continue;
	const text = sources.get(file);
	for (const match of text.matchAll(DEV_ONLY_NAMES))
		report(
			"no-dev-in-ui",
			file,
			text.slice(0, match.index).split("\n").length,
			`"${match[0]}" — dev-only seed/clear/reset controls were removed and must not return`,
		);
}

// The dev-only starter profile is reachable only through a `__DEV__` branch, so the production bundle never contains it.
const STARTER_SITE = {
	"src/modules/habits/screens/starter-profile-gate": ["src/app/_layout.tsx"],
	"src/modules/habits/services/starter-profile-service": [
		"src/modules/habits/screens/starter-profile-gate.tsx",
	],
	"src/modules/habits/repositories/starter-profile-repository": [
		"src/modules/habits/services/starter-profile-service.ts",
		// The web twin's compile-time `import type` of the native shape.
		"src/modules/habits/repositories/starter-profile-repository.web.ts",
	],
	"src/modules/habits/dev/starter-profile": [
		"src/modules/habits/services/starter-profile-service.ts",
		"src/modules/habits/repositories/starter-profile-repository.ts",
	],
};
const STARTER_GATE = "src/modules/habits/screens/starter-profile-gate";
const STARTER_ENV = "EXPO_PUBLIC_STARTER_PROFILE";
for (const file of productionFiles) {
	const r = rel(file);
	for (const { spec, line } of importsOf(file)) {
		const target = resolveImport(file, spec)?.replace(/\.web$/, "");
		const owners = target && STARTER_SITE[target];
		if (!owners || owners.includes(r)) continue;
		report(
			"starter-profile-site",
			file,
			line,
			`imports the dev-only starter profile (${target}) — only ${owners.join(" / ")} may`,
			spec,
		);
	}
	const text = sources.get(file);
	if (r !== `${STARTER_GATE}.tsx`) {
		const at = text.indexOf(STARTER_ENV);
		if (at !== -1)
			report(
				"starter-profile-site",
				file,
				text.slice(0, at).split("\n").length,
				`${STARTER_ENV} may be read only inside the starter-profile gate (the dead branch of __DEV__)`,
			);
	}
	if (r === "src/app/_layout.tsx") {
		const gated =
			/__DEV__\s*\?\s*require\(\s*["'][^"']*starter-profile-gate["']\s*\)/;
		const mentions = text.match(/starter-profile-gate/g)?.length ?? 0;
		if (mentions > 0 && (mentions !== 1 || !gated.test(text)))
			report(
				"starter-profile-site",
				file,
				1,
				"the starter-profile gate must be required exactly once, as `__DEV__ ? require(...)`, so production bundles drop it",
			);
	}
}

const keyOf = (v) => [v.rule, v.file, v.import ?? ""].join("|");

if (args.includes("--print-allowlist")) {
	const seen = new Map();
	for (const v of violations)
		seen.set(keyOf(v), {
			rule: v.rule,
			file: v.file,
			...(v.import ? { import: v.import } : {}),
		});
	const entries = [...seen.values()].sort((a, b) =>
		keyOf(a).localeCompare(keyOf(b)),
	);
	console.log(JSON.stringify(entries, null, "\t"));
	process.exit(0);
}

const allowlist = ALLOWLIST_FILE
	? JSON.parse(fs.readFileSync(ALLOWLIST_FILE, "utf8"))
	: [];
const allowed = new Map(allowlist.map((entry) => [keyOf(entry), entry]));
const used = new Set();

const failures = [];
for (const v of violations) {
	const key = keyOf(v);
	if (allowed.has(key)) used.add(key);
	else failures.push(v);
}
const stale = [...allowed.keys()].filter((key) => !used.has(key));

if (failures.length === 0 && stale.length === 0) {
	console.log(
		`check-architecture: OK (${violations.length} allowlisted known violation${violations.length === 1 ? "" : "s"})`,
	);
	process.exit(0);
}

for (const v of failures)
	console.error(`${v.file}:${v.line}  [${v.rule}] ${v.message}`);
for (const key of stale) {
	const [rule, file, spec] = key.split("|");
	console.error(
		`scripts/check-architecture.allowlist.json  [stale] ${rule} ${file}${spec ? ` -> ${spec}` : ""} no longer violates — remove this allowlist entry`,
	);
}
console.error(
	`\ncheck-architecture: ${failures.length} violation(s), ${stale.length} stale allowlist entr${stale.length === 1 ? "y" : "ies"}`,
);
process.exit(1);
