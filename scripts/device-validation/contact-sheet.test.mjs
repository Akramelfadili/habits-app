import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildSheet, ROOT_BASELINES } from "./contact-sheet.mjs";

test("pairs a baseline with its screenshot and lists what is missing", async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-"));
	const shots = path.join(dir, "shots", "shots-light");
	fs.mkdirSync(shots, { recursive: true });
	fs.copyFileSync(
		path.join(ROOT_BASELINES, "first-run.png"),
		path.join(shots, "first-run.png"),
	);
	const out = path.join(dir, "sheet");
	const result = await buildSheet({ shots: path.join(dir, "shots"), out });

	assert.equal(result.captured, 1);
	const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
	assert.match(html, /data-name="first-run" data-status="captured"/);
	assert.match(
		html,
		/data-name="today-loading" data-status="not reproducible"/,
	);
	const missing = JSON.parse(
		fs.readFileSync(path.join(out, "missing.json"), "utf8"),
	);
	assert.ok(missing.missing.includes("today"));
	assert.ok(!missing.missing.includes("first-run"));
	assert.ok(
		missing.notReproducible.some((s) => s.name === "migration-running"),
	);
	fs.rmSync(dir, { recursive: true, force: true });
});
