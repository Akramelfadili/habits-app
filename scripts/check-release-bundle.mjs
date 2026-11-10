#!/usr/bin/env node
// Release-bundle guard (`make release-check`). Builds the iOS JS bundle the way
// a production EAS build does (APP_VARIANT=production) into a temp folder
// OUTSIDE the repo and fails if anything dev-only is inside it, or if the
// bundle grew more than 10 percent over scripts/bundle-size.baseline.json.
//
//   node scripts/check-release-bundle.mjs                   export, scan, compare
//   node scripts/check-release-bundle.mjs --update-baseline write the baseline (set it, or lower it)
//
// The export is a Hermes bytecode bundle (.hbc). Hermes keeps string literals
// and function names, not comments or local names, so every marker below is a
// string literal or a named function that only the dev-only code defines. Two
// look-alikes are deliberately NOT markers: `useDrizzleStudio` and
// `StarterProfileGate` also name the no-op stand-ins in `database-provider.tsx`
// and `_layout.tsx`, so they appear in every bundle.
//
// Markers (derived from the source; each must be absent from a release bundle):
//  - The starter profile (src/modules/habits/dev/starter-profile.ts, the gate in
//    screens/starter-profile-gate.tsx, services/starter-profile-service.ts):
//    log events "dev.starter_profile.*", the settings key "dev.starterProfile",
//    and the functions applyStarterProfile, parseStarterProfile,
//    starterProfileSchema. The gate has no string of its own; it is reached
//    only through applyStarterProfile.
//  - The dev-state loader (screens/dev-state-screen.tsx, services/load-device-state.ts,
//    dev/device-state.ts, repositories/dev-state-repository.ts,
//    lib/device-validation/launch-request.ts): the log event "devstate.load_failed",
//    the launch file name "dev-state.json", and the functions loadDeviceState,
//    buildDeviceState, replaceAllData. The route name "dev-state" itself is not
//    a marker: the route file exists in every build and redirects to Today.
//  - Drizzle Studio (src/lib/db/database-provider.tsx): the plugin names its
//    devtools client "expo-drizzle-studio-plugin".
//  - A canary: this script sets EXPO_PUBLIC_STARTER_PROFILE to a profile naming
//    a unique habit. If the gate were compiled in, Metro would inline the value
//    and the canary would be in the bundle.
//
// The size baseline only shrinks, like the token baseline: --update-baseline
// refuses to raise it. Growth of up to 10 percent over the baseline passes; a
// bigger step needs a reviewed hand edit of the baseline file with a reason.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CANARY_HABIT_NAME = "CANARY_HABIT_NAME_7f3a";
export const CANARY_PROFILE = JSON.stringify({
	habits: [{ name: CANARY_HABIT_NAME, category: "Health", frequency: "daily" }],
});

/** [group, needle] pairs; a needle in the bundle is a leak. */
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

/** Growth over the baseline that still passes. */
export const MAX_GROWTH = 0.1;

/**
 * The markers found in a bundle. Hermes stores a string as one byte per
 * character when it is ASCII and as UTF-16 otherwise; both are searched.
 * @param {Buffer} bundle
 * @param {[string, string][]} markers
 * @returns {{ group: string, needle: string }[]}
 */
export function findLeaks(bundle, markers = MARKERS) {
	return markers
		.filter(
			([, needle]) =>
				bundle.includes(Buffer.from(needle, "latin1")) ||
				bundle.includes(Buffer.from(needle, "utf16le")),
		)
		.map(([group, needle]) => ({ group, needle }));
}

/**
 * Compares the bundle size with the baseline.
 * @param {number} bytes
 * @param {{ bytes: number } | undefined} baseline
 * @returns {{ ok: boolean, message: string }}
 */
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

/**
 * What --update-baseline may write: a first value, or a lower one.
 * @param {number} bytes
 * @param {{ bytes: number } | undefined} baseline
 * @returns {{ ok: boolean, message: string }}
 */
export function checkBaselineUpdate(bytes, baseline) {
	if (baseline !== undefined && bytes > baseline.bytes) {
		return {
			ok: false,
			message: `refusing to raise the baseline (${baseline.bytes} -> ${bytes}); shrink the bundle, or edit the file by hand in a reviewed change`,
		};
	}
	return { ok: true, message: `baseline set to ${bytes} bytes` };
}

/** Every JS bundle (.hbc, or .js when Hermes is off) the export wrote for iOS. */
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
	// A production build's environment, plus the canary. The device-validation
	// flag is set to empty, not left unset: Expo would otherwise fill an unset
	// variable from a developer's .env.local, and process.env wins over it.
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
