#!/usr/bin/env node
// `make release-check`: builds the iOS bundle like a production EAS build into a temp folder outside the repo;
// fails on any dev-only marker or growth over 10 percent of scripts/bundle-size.baseline.json.
//   node scripts/check-release-bundle.mjs [--update-baseline]
// Hermes keeps string literals and function names, not comments or locals, so markers are strings or named functions only dev code defines.
// `useDrizzleStudio` and `StarterProfileGate` are NOT markers: no-op stand-ins in `database-provider.tsx` and `_layout.tsx` appear in every bundle.
// The canary profile names a unique habit: if the starter-profile gate were compiled in, Metro would inline it and it would show up here.
// The baseline only shrinks: --update-baseline refuses to raise it; a bigger step needs a reviewed hand edit.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CANARY_HABIT_NAME = "CANARY_HABIT_NAME_7f3a";
export const CANARY_PROFILE = JSON.stringify({
	habits: [{ name: CANARY_HABIT_NAME, category: "Health", frequency: "daily" }],
});

export const MARKERS = [
	["canary", CANARY_HABIT_NAME],
	["starter profile", "dev.starter_profile."],
	["starter profile", "dev.starterProfile"],
	["starter profile", "applyStarterProfile"],
	["starter profile", "parseStarterProfile"],
	["starter profile", "starterProfileSchema"],
	["dev-state loader", "devstate.load_failed"],
	["dev-state loader", "dev-state.json"],
	["dev-state loader", "loadDeviceState"],
	["dev-state loader", "buildDeviceState"],
	["dev-state loader", "replaceAllData"],
	["drizzle studio", "expo-drizzle-studio-plugin"],
];

export const MAX_GROWTH = 0.1;

// Hermes stores a string as one byte per character when ASCII and as UTF-16 otherwise; both are searched.
export function findLeaks(bundle, markers = MARKERS) {
	return markers
		.filter(
			([, needle]) =>
				bundle.includes(Buffer.from(needle, "latin1")) ||
				bundle.includes(Buffer.from(needle, "utf16le")),
		)
		.map(([group, needle]) => ({ group, needle }));
}

export function checkSize(bytes, baseline) {
	if (baseline === undefined) {
		return {
			ok: true,
			message: `no baseline yet (${bytes} bytes); run with --update-baseline to set it`,
		};
	}
	const limit = Math.floor(baseline.bytes * (1 + MAX_GROWTH));
	if (bytes > limit) {
		const pct = ((bytes / baseline.bytes - 1) * 100).toFixed(1);
		return {
			ok: false,
			message: `bundle is ${bytes} bytes, ${pct}% over the baseline of ${baseline.bytes} (limit ${limit}, +${MAX_GROWTH * 100}%)`,
		};
	}
	return {
		ok: true,
		message: `${bytes} bytes against a baseline of ${baseline.bytes} (limit ${limit})`,
	};
}

export function checkBaselineUpdate(bytes, baseline) {
	if (baseline !== undefined && bytes > baseline.bytes) {
		return {
			ok: false,
			message: `refusing to raise the baseline (${baseline.bytes} -> ${bytes}); shrink the bundle, or edit the file by hand in a reviewed change`,
		};
	}
	return { ok: true, message: `baseline set to ${bytes} bytes` };
}

export function collectBundles(outDir) {
	const dir = path.join(outDir, "_expo", "static", "js", "ios");
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((name) => /\.(hbc|js)$/.test(name))
		.map((name) => path.join(dir, name));
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BASELINE_FILE = path.join(
	root,
	"scripts",
	"bundle-size.baseline.json",
);

function readBaseline() {
	if (!fs.existsSync(BASELINE_FILE)) return undefined;
	return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
}

function exportBundle(outDir) {
	// The device-validation flag is set to empty, not left unset: Expo would fill an unset variable from a developer's .env.local.
	const env = {
		...process.env,
		APP_VARIANT: "production",
		EXPO_PUBLIC_STARTER_PROFILE: CANARY_PROFILE,
		EXPO_PUBLIC_DEVICE_VALIDATION: "",
		CI: "1",
	};
	delete env.EAS_BUILD_PROFILE; // the config's own production guard would reject the canary
	const result = spawnSync(
		"npx",
		["expo", "export", "--platform", "ios", "--output-dir", outDir],
		{ cwd: root, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
	);
	if (result.status !== 0) {
		console.error(result.stdout?.split("\n").slice(-30).join("\n"));
		console.error(result.stderr?.split("\n").slice(-30).join("\n"));
		throw new Error(
			`expo export failed (exit ${result.status ?? result.signal})`,
		);
	}
}

function main() {
	const update = process.argv.includes("--update-baseline");
	const outDir = fs.mkdtempSync(
		path.join(os.tmpdir(), "habits-release-check-"),
	);
	try {
		console.log(
			`release-check: exporting the production iOS bundle to ${outDir}`,
		);
		exportBundle(outDir);

		const files = collectBundles(outDir);
		if (files.length === 0) {
			throw new Error(
				"the export wrote no iOS JS bundle (_expo/static/js/ios)",
			);
		}
		const buffers = files.map((file) => fs.readFileSync(file));
		const bytes = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
		console.log(
			`release-check: bundle ${files.map((f) => path.basename(f)).join(", ")}`,
		);

		const leaks = buffers.flatMap((buffer) => findLeaks(buffer));
		for (const leak of leaks) {
			console.error(
				`release-check: LEAK [${leak.group}] "${leak.needle}" is in the release bundle`,
			);
		}

		const baseline = readBaseline();
		const size = checkSize(bytes, baseline);
		console.log(`release-check: size ${size.message}`);
		let ok = leaks.length === 0 && size.ok;

		if (update) {
			const next = checkBaselineUpdate(bytes, baseline);
			if (!next.ok) {
				console.error(`release-check: ${next.message}`);
				ok = false;
			} else {
				fs.writeFileSync(
					BASELINE_FILE,
					`${JSON.stringify({ bytes }, null, "\t")}\n`,
				);
				console.log(`release-check: ${next.message}`);
			}
		}

		console.log(ok ? "release-check: OK" : "release-check: FAILED");
		return ok ? 0 : 1;
	} finally {
		fs.rmSync(outDir, { recursive: true, force: true });
	}
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	try {
		process.exitCode = main();
	} catch (error) {
		console.error(
			`release-check: ${error instanceof Error ? error.message : error}`,
		);
		process.exitCode = 1;
	}
}
