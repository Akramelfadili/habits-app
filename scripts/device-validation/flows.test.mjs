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

/**
 * Flow lint. The journeys cannot run in `make check` (they need Maestro and a
 * dev server), so this catches what a run would: a line Maestro's YAML would
 * reject, and a tap or assertion on text that no longer exists in the app.
 * `yaml` is not a dependency of this repo, so the flows' small, regular shape is
 * checked by hand: a header, `---`, then `- command` lines with optional nested
 * `key: value` lines.
 */
const SELECTOR_COMMANDS = new Set([
	"tapOn",
	"assertVisible",
	"assertNotVisible",
]);
const WEEKDAYS_AND_MONTHS =
	/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)$/;

/** Reads a flow into its commands, throwing on any line that is not YAML of the expected shape. */
function parseFlow(text, file) {
	const parts = text.split(/^---\s*$/m);
	assert.equal(
		parts.length,
		2,
		`${file}: expected one --- between header and commands`,
	);
	const [header, body] = parts;
	assert.match(header, /^url:\s*\$\{APP_URL\}\//m, `${file}: no url: header`);
	assert.match(header, /^tags:\s*$/m, `${file}: no tags: header`);
	const commands = [];
	for (const [index, line] of body.split("\n").entries()) {
		const where = `${file}:${index + 1 + header.split("\n").length}`;
		if (/^\s*(#.*)?$/.test(line)) continue;
		const start = /^- (\w+)(?::[ ]?(.*))?$/.exec(line);
		if (start) {
			commands.push({ name: start[1], inline: start[2], keys: {} });
			continue;
		}
		const nested = /^ {4}(\w+):[ ]?(.*)$/.exec(line);
		assert.ok(
			nested && commands.length > 0,
			`${where}: not a command or key: ${line}`,
		);
		commands.at(-1).keys[nested[1]] = nested[2];
	}
	return commands;
}

const unquote = (value) => {
	if (value === undefined || value === "") return undefined;
	const quoted = /^"(.*)"$/.exec(value);
	if (value.startsWith('"')) assert.ok(quoted, `unterminated string: ${value}`);
	return quoted ? quoted[1] : value;
};

/** The words (4+ letters) of a selector that must exist somewhere in the app's strings. */
function wordsToFind(selector) {
	return selector
		.replace(/\[\?\]/g, "?")
		.split(/[^A-Za-z]+/)
		.filter((word) => word.length >= 4 && !WEEKDAYS_AND_MONTHS.test(word));
}

function appStrings() {
	const chunks = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const file = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(file);
			else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
				chunks.push(fs.readFileSync(file, "utf8"));
		}
	};
	walk(path.join(ROOT, "src"));
	return chunks.join("\n");
}

test("every e2e flow is well-formed and taps or asserts only text the app contains", () => {
	const dir = path.join(ROOT, "e2e");
	const strings = appStrings();
	const files = fs.readdirSync(dir).filter((name) => name.endsWith(".yaml"));
	assert.ok(files.length >= 9);
	for (const file of files) {
		const commands = parseFlow(
			fs.readFileSync(path.join(dir, file), "utf8"),
			file,
		);
		assert.ok(commands.length > 3, `${file}: no commands`);
		// Text the journey types itself ("Floss", a note) is in no source file.
		const typed = new Set(
			commands
				.filter((command) => command.name === "inputText")
				.flatMap((command) => wordsToFind(unquote(command.inline) ?? "")),
		);
		for (const command of commands) {
			if (!SELECTOR_COMMANDS.has(command.name)) continue;
			const selectors = [
				command.inline,
				command.keys.id,
				command.keys.text,
				command.keys.visible,
			]
				.map(unquote)
				.filter((value) => value !== undefined);
			for (const selector of selectors) {
				for (const word of wordsToFind(selector)) {
					if (typed.has(word)) continue;
					assert.ok(
						strings.includes(word),
						`${file}: "${selector}" uses "${word}", which no app string contains`,
					);
				}
			}
		}
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
