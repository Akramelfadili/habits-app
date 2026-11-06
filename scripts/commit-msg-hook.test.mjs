// Tests for .husky/commit-msg: attribution lines are rejected, ordinary messages pass.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	".husky",
	"commit-msg",
);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "commit-msg-"));
after(() => fs.rmSync(dir, { recursive: true, force: true }));

function run(message) {
	const file = path.join(dir, "MSG");
	fs.writeFileSync(file, message);
	return spawnSync("sh", [HOOK, file], { encoding: "utf8" });
}

describe("commit-msg hook", () => {
	it("accepts a normal message", () => {
		assert.equal(run("Fix streak rollover\n\nLonger body.\n").status, 0);
	});

	it("ignores git comment lines", () => {
		assert.equal(run("Fix it\n# Co-Authored-By in a comment\n").status, 0);
	});

	for (const [name, message] of [
		["Co-Authored-By", "Fix\n\nCo-Authored-By: A <a@example.com>\n"],
		["case-insensitive trailer", "Fix\n\nco-authored-by: A <a@example.com>\n"],
		["Generated with", "Fix\n\n🤖 Generated with a tool\n"],
		["session URL", "Fix\n\nhttps://claude.ai/code/session_123\n"],
	]) {
		it(`rejects ${name}`, () => {
			const result = run(message);
			assert.equal(result.status, 1);
			assert.match(result.stderr, /no attribution lines/);
		});
	}
});
