import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { buildSheet } from "./contact-sheet.mjs";

// A tiny generated baseline: resizing all ~400 real ones took 15-19 s once sharp was installed.
async function tinyPng(file, width = 40, height = 80) {
	await sharp({
		create: { width, height, channels: 3, background: "#3366cc" },
	})
		.png()
		.toFile(file);
}

test("pairs a baseline with its screenshot and lists what is missing", async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-"));
	const baselines = path.join(dir, "baselines");
	const shots = path.join(dir, "shots", "shots-light");
	fs.mkdirSync(baselines, { recursive: true });
	fs.mkdirSync(shots, { recursive: true });
	await tinyPng(path.join(baselines, "first-run.png"));
	await tinyPng(path.join(shots, "first-run.png"), 600, 1200);
	const out = path.join(dir, "sheet");
	const result = await buildSheet({
		shots: path.join(dir, "shots"),
		out,
		width: 30,
		baselines,
	});

	assert.equal(result.captured, 1);
	const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
	assert.match(html, /data-name="first-run" data-status="captured"/);
	assert.match(html, /src="img\/web\/first-run\.jpg"/);
	assert.match(html, /src="img\/ios\/first-run\.jpg"/);
	assert.match(
		html,
		/data-name="today-loading" data-status="not reproducible"/,
	);

	for (const kind of ["web", "ios"]) {
		const meta = await sharp(
			path.join(out, "img", kind, "first-run.jpg"),
		).metadata();
		assert.equal(meta.format, "jpeg");
		assert.equal(meta.width, 30);
	}

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
