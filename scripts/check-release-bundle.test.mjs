import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	CANARY_HABIT_NAME,
	CANARY_PROFILE,
	checkBaselineUpdate,
	checkSize,
	collectBundles,
	findLeaks,
	MARKERS,
} from "./check-release-bundle.mjs";

const clean = Buffer.from(
	"function a(){return 1}__d(function(){});Today screen",
);

test("a clean bundle has no leaks", () => {
	assert.deepEqual(findLeaks(clean), []);
});

test("every marker is found, as one-byte and as UTF-16 text", () => {
	for (const [group, needle] of MARKERS) {
		const ascii = Buffer.concat([
			clean,
			Buffer.from(`\0${needle}\0`, "latin1"),
		]);
		const wide = Buffer.concat([
			clean,
			Buffer.from(`\0${needle}\0`, "utf16le"),
		]);
		assert.deepEqual(findLeaks(ascii), [{ group, needle }], needle);
		assert.deepEqual(findLeaks(wide), [{ group, needle }], needle);
	}
});

test("the markers cover the canary, the starter profile, the dev-state loader and Drizzle Studio", () => {
	const groups = new Set(MARKERS.map(([group]) => group));
	assert.deepEqual(
		[...groups].sort(),
		["canary", "dev-state loader", "drizzle studio", "starter profile"].sort(),
	);
});

test("look-alike names that every bundle carries are not markers", () => {
	const needles = MARKERS.map(([, needle]) => needle);
	assert.ok(!needles.includes("useDrizzleStudio"));
	assert.ok(!needles.includes("StarterProfileGate"));
	assert.ok(!needles.includes("dev-state"));
});

test("the canary profile is valid JSON naming the canary habit", () => {
	const parsed = JSON.parse(CANARY_PROFILE);
	assert.equal(parsed.habits[0].name, CANARY_HABIT_NAME);
});

test("several leaks are all reported", () => {
	const bundle = Buffer.from(
		`x ${CANARY_HABIT_NAME} y loadDeviceState z expo-drizzle-studio-plugin`,
	);
	assert.deepEqual(
		findLeaks(bundle).map((leak) => leak.needle),
		[CANARY_HABIT_NAME, "loadDeviceState", "expo-drizzle-studio-plugin"],
	);
});

test("size: a missing baseline passes, growth up to 10 percent passes, more fails", () => {
	assert.equal(checkSize(7_000_000, undefined).ok, true);
	assert.equal(checkSize(1000, { bytes: 1000 }).ok, true);
	assert.equal(checkSize(1100, { bytes: 1000 }).ok, true);
	assert.equal(checkSize(1101, { bytes: 1000 }).ok, false);
	assert.equal(checkSize(500, { bytes: 1000 }).ok, true);
	assert.match(checkSize(1200, { bytes: 1000 }).message, /20\.0% over/);
});

test("the baseline can be set or lowered but never raised by the script", () => {
	assert.equal(checkBaselineUpdate(1000, undefined).ok, true);
	assert.equal(checkBaselineUpdate(900, { bytes: 1000 }).ok, true);
	assert.equal(checkBaselineUpdate(1000, { bytes: 1000 }).ok, true);
	assert.equal(checkBaselineUpdate(1001, { bytes: 1000 }).ok, false);
});

test("collectBundles finds the iOS bundles and ignores other files", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-bundle-test-"));
	try {
		assert.deepEqual(collectBundles(dir), []);
		const js = path.join(dir, "_expo", "static", "js", "ios");
		fs.mkdirSync(js, { recursive: true });
		fs.writeFileSync(path.join(js, "entry-abc.hbc"), "x");
		fs.writeFileSync(path.join(js, "entry-abc.hbc.map"), "x");
		assert.deepEqual(collectBundles(dir), [path.join(js, "entry-abc.hbc")]);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});
