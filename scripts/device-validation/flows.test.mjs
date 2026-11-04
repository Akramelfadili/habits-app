import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { BUG_FLOWS, convertWebFlow, ROOT, readCommands } from "./flows.mjs";

test("every web journey converts: route, clock, no launchApp, text selectors", () => {
	const dir = path.join(ROOT, "e2e");
	const files = fs.readdirSync(dir).filter((n) => n.endsWith(".yaml"));
	assert.ok(files.length >= 6);
	for (const file of files) {
		const { route, clock, flow } = convertWebFlow(
			fs.readFileSync(path.join(dir, file), "utf8"),
			file,
		);
		assert.match(route, /^\//, file);
		assert.doesNotMatch(route, /clock=/, file);
		assert.match(clock, /^\d{4}-\d\d-\d\dT/, file);
		assert.doesNotMatch(flow, /launchApp|\bid:/, file);
		assert.match(flow, /^appId: \$\{BUNDLE_ID\}\n---\n/, file);
	}
});

test("every known-bug flow has a file with the bundle id placeholder, and every file is listed", () => {
	const dir = path.join(ROOT, "scripts/device-validation/flows");
	const files = fs.readdirSync(dir).filter((n) => n.endsWith(".yaml"));
	assert.deepEqual(BUG_FLOWS.map((f) => `${f.id}.yaml`).sort(), files.sort());
	for (const flow of BUG_FLOWS) {
		assert.match(
			fs.readFileSync(flow.source, "utf8"),
			/^appId: \$\{BUNDLE_ID\}$/m,
			flow.id,
		);
	}
});

test("readCommands tolerates a missing or malformed log", () => {
	assert.deepEqual(readCommands("/nonexistent"), []);
});

test("iosSelectors widens web texts to iOS's merged labels", async () => {
	const { iosSelectors } = await import("./flows.mjs");
	const out = iosSelectors(
		[
			'- tapOn: "Meditate"',
			"- tapOn:",
			'    text: "Habits"',
			'- assertVisible: "None"',
			'- assertVisible: "Remind you each day?"',
			'- assertVisible: "Small habits,.*"',
			'- assertVisible: "Thursday, 1 October"',
			'- inputText: "Run"',
		].join("\n"),
	);
	assert.match(out, /tapOn: "Meditate\(,\.\*\)\?"/);
	assert.match(out, /text: "Habits\(,\.\*\)\?"/);
	assert.match(out, /assertVisible: "\.\*None\.\*"/);
	assert.match(out, /"\.\*Remind you each day\\\?\.\*"/);
	assert.match(out, /"Small habits,\.\*"/);
	assert.match(out, /"\.\*Thursday,\? 1 October\.\*"/);
	assert.match(out, /inputText: "Run"/);
});
