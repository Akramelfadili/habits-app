#!/usr/bin/env node
/**
 * Renders the V3 Claude Design mockups (docs/mockups/v3/*.dc.html) to PNG
 * slices + plain text, so they can be read without opening a browser — by a
 * person skimming, or by an agent that can view images but not run the
 * design runtime.
 *
 *   npm run mockups:render                 # every section
 *   npm run mockups:render -- today sheets # just these
 *
 * For each section: a full-page screenshot cut into ~1800 px slices
 * (renders/<section>/slice_00.png, …) and document.body.innerText
 * (renders/<section>/text.txt). Then renders/INDEX.md maps every frame ID
 * (T1, P7, DC1, …) to the slice it sits in.
 *
 * The .dc.html files fetch themselves and load React from unpkg, so they are
 * served over a throwaway local HTTP server (file:// breaks the runtime's
 * fetch) and need network access.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { libraryPath, ROOT } from "./lib/dev-server.mjs";

const MOCKUP_DIR = path.join(ROOT, "docs/mockups/v3");
const RENDER_DIR = path.join(MOCKUP_DIR, "renders");

/** Section name → file. "foundations" is the master file's default view. */
const SECTIONS = {
	foundations: "Habits V3.dc.html",
	today: "Habits V3 - Today.dc.html",
	progress: "Habits V3 - Progress.dc.html",
	habits: "Habits V3 - Habits.dc.html",
	forms: "Habits V3 - Habits Forms.dc.html",
	settings: "Habits V3 - Habits Settings.dc.html",
	sheets: "Habits V3 - Sheets.dc.html",
	states: "Habits V3 - States.dc.html",
	handoff: "Habits V3 - Handoff.dc.html",
};

const VIEWPORT = { width: 1700, height: 1000 };
const SLICE_HEIGHT = 1800;
const RENDER_TIMEOUT_MS = 60_000;

/**
 * Element ids the design runtime gives each frame/block — the anchors the
 * index maps to slices. Anything else (dc-root, layout ids) is skipped.
 */
const ANCHOR_ID =
	/^(?:[A-Z]{1,2}\d{1,2}[a-z]?|V3-\d{2}[a-z]?|PR-\d{2}|ax3|nav|components|today|progress|habits|handoff|messages|proposals(?:-\w+)?|data-[\w-]+|hand-notes|a11y-[\w-]+|cl-[\w-]+|open-decisions|self-critique)$/;

/** IDs that are only mentioned in text (tokens, components, change-log rows). */
const TEXT_ID =
	/\b(?:V3-\d{2}[a-z]?|[FT]-\d{2}|PR-\d{2}|CL\.\d|0\d\.\d{1,2}[a-z]?|(?:DC|QS|RL|HP|SR|TC|EX|BS|FR|SY|[TPHDFCRS])\d{1,2})\b/g;

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".jsx": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
};

function serve(dir) {
	const server = http.createServer((req, res) => {
		const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
		const file = path.join(dir, rel);
		if (!file.startsWith(dir)) {
			res.writeHead(403).end();
			return;
		}
		fs.readFile(file, (err, data) => {
			if (err) {
				res.writeHead(404).end();
				return;
			}
			res.writeHead(200, {
				"content-type": MIME[path.extname(file)] ?? "application/octet-stream",
			});
			res.end(data);
		});
	});
	return new Promise((resolve) =>
		server.listen(0, "127.0.0.1", () => resolve(server)),
	);
}

/**
 * Rendered = the runtime has filled #dc-root, fonts are in, the network is
 * idle and the text has stopped changing across three polls. No fixed sleep.
 */
async function waitUntilRendered(page) {
	await page.waitForLoadState("networkidle", { timeout: RENDER_TIMEOUT_MS });
	await page.waitForFunction(
		() => document.querySelector("#dc-root")?.childElementCount > 0,
		null,
		{ timeout: RENDER_TIMEOUT_MS },
	);
	await page.evaluate(() => document.fonts.ready);
	await page.waitForFunction(
		() => {
			const sig = `${document.body.innerText.length}:${document.documentElement.scrollHeight}`;
			const w = window;
			w.__renderSig = w.__renderSig ?? [];
			w.__renderSig.push(sig);
			const last = w.__renderSig.slice(-3);
			return last.length === 3 && last.every((s) => s === last[0]);
		},
		null,
		{ polling: 250, timeout: RENDER_TIMEOUT_MS },
	);
}

/** Frame anchors and text-only IDs, each with its page y (first occurrence). */
async function collectIds(page, anchorSource, textSource) {
	return page.evaluate(
		([anchorSrc, textSrc]) => {
			const anchorRe = new RegExp(anchorSrc);
			const anchors = [];
			for (const el of document.querySelectorAll("[id]")) {
				if (!anchorRe.test(el.id)) continue;
				const y = el.getBoundingClientRect().top + window.scrollY;
				anchors.push({ id: el.id, y });
			}
			const textRe = new RegExp(textSrc, "g");
			const mentions = new Map();
			const walker = document.createTreeWalker(
				document.body,
				NodeFilter.SHOW_TEXT,
			);
			for (let node = walker.nextNode(); node; node = walker.nextNode()) {
				for (const match of node.data.matchAll(textRe)) {
					if (mentions.has(match[0])) continue;
					const range = document.createRange();
					range.setStart(node, match.index);
					range.setEnd(node, match.index + match[0].length);
					const rect = range.getBoundingClientRect();
					if (rect.height === 0) continue;
					mentions.set(match[0], rect.top + window.scrollY);
				}
			}
			return {
				anchors,
				mentions: [...mentions].map(([id, y]) => ({ id, y })),
			};
		},
		[anchorSource, textSource],
	);
}

async function renderSection(browser, baseUrl, section, file) {
	const page = await browser.newPage({ viewport: VIEWPORT });
	const problems = [];
	page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
	page.on("requestfailed", (req) =>
		problems.push(`request failed: ${req.url()} (${req.failure()?.errorText})`),
	);
	try {
		await page.goto(`${baseUrl}/${encodeURIComponent(file)}`, {
			waitUntil: "load",
			timeout: RENDER_TIMEOUT_MS,
		});
		await waitUntilRendered(page);

		const outDir = path.join(RENDER_DIR, section);
		fs.rmSync(outDir, { recursive: true, force: true });
		fs.mkdirSync(outDir, { recursive: true });

		const { width, height } = await page.evaluate(() => ({
			width: document.documentElement.scrollWidth,
			height: document.documentElement.scrollHeight,
		}));
		const sliceCount = Math.ceil(height / SLICE_HEIGHT);
		for (let i = 0; i < sliceCount; i++) {
			const y = i * SLICE_HEIGHT;
			await page.screenshot({
				path: path.join(outDir, `slice_${String(i).padStart(2, "0")}.png`),
				fullPage: true,
				clip: { x: 0, y, width, height: Math.min(SLICE_HEIGHT, height - y) },
			});
		}

		const text = await page.evaluate(() => document.body.innerText);
		fs.writeFileSync(path.join(outDir, "text.txt"), `${text.trim()}\n`);

		const ids = await collectIds(page, ANCHOR_ID.source, TEXT_ID.source);
		return { section, file, height, sliceCount, ids, problems };
	} finally {
		await page.close();
	}
}

function sliceOf(y) {
	return `slice_${String(Math.floor(Math.max(0, y) / SLICE_HEIGHT)).padStart(2, "0")}`;
}

function dirBytes(dir) {
	let total = 0;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		total += entry.isDirectory() ? dirBytes(full) : fs.statSync(full).size;
	}
	return total;
}

function writeIndex(results) {
	const lines = [
		"# V3 mockup renders — index",
		"",
		"Generated by `npm run mockups:render` (scripts/render-mockups.mjs) — do not edit by hand.",
		"Read `text.txt` for copy and rules, the slices for layout. Each slice is",
		`${SLICE_HEIGHT} px of a ${VIEWPORT.width} px-wide page; frame positions come from the rendered layout.`,
		"",
		"| Section | File | Slices | Size |",
		"|---|---|---|---|",
	];
	for (const r of results) {
		const kb = Math.round(dirBytes(path.join(RENDER_DIR, r.section)) / 1024);
		lines.push(
			`| [${r.section}](${r.section}/text.txt) | \`${r.file}\` | ${r.sliceCount} | ${kb} KB |`,
		);
	}
	for (const r of results) {
		lines.push(
			"",
			`## ${r.section}`,
			"",
			`\`${r.file}\` · ${r.sliceCount} slices`,
			"",
		);
		const anchorIds = new Set(r.ids.anchors.map((a) => a.id));
		const bySlice = new Map();
		const add = (slice, kind, id) => {
			if (!bySlice.has(slice)) bySlice.set(slice, { frames: [], mentions: [] });
			bySlice.get(slice)[kind].push(id);
		};
		for (const a of r.ids.anchors) add(sliceOf(a.y), "frames", a.id);
		for (const m of r.ids.mentions) {
			if (!anchorIds.has(m.id)) add(sliceOf(m.y), "mentions", m.id);
		}
		lines.push(
			"| Slice | Frames / blocks (anchored) | Other IDs first mentioned here |",
			"|---|---|---|",
		);
		for (const slice of [...bySlice.keys()].sort()) {
			const { frames, mentions } = bySlice.get(slice);
			lines.push(
				`| [${slice}](${r.section}/${slice}.png) | ${frames.join(", ") || "—"} | ${mentions.join(", ") || "—"} |`,
			);
		}
	}
	fs.writeFileSync(path.join(RENDER_DIR, "INDEX.md"), `${lines.join("\n")}\n`);
}

async function main() {
	const selected = process.argv.slice(2);
	const unknown = selected.filter((name) => !(name in SECTIONS));
	if (unknown.length > 0) {
		console.error(
			`Unknown section(s): ${unknown.join(", ")}. Sections: ${Object.keys(SECTIONS).join(", ")}`,
		);
		process.exit(1);
	}
	const sections = selected.length > 0 ? selected : Object.keys(SECTIONS);

	process.env.LD_LIBRARY_PATH = libraryPath();
	const { chromium } = await import("playwright");

	fs.mkdirSync(RENDER_DIR, { recursive: true });
	const server = await serve(MOCKUP_DIR);
	const baseUrl = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch();
	const results = [];
	let failed = false;
	try {
		for (const section of sections) {
			const started = Date.now();
			try {
				const r = await renderSection(
					browser,
					baseUrl,
					section,
					SECTIONS[section],
				);
				results.push(r);
				console.log(
					`✓ ${section}: ${r.sliceCount} slices, ${r.ids.anchors.length} frames (${Date.now() - started} ms)`,
				);
				for (const p of r.problems) console.warn(`  ! ${p}`);
			} catch (err) {
				failed = true;
				console.error(`✗ ${section}: ${err.message}`);
			}
		}
	} finally {
		await browser.close();
		server.close();
	}

	// INDEX covers every section on disk, so a partial run keeps the others.
	if (selected.length > 0) {
		console.log(
			"Partial run: INDEX.md left as is (run without arguments to rebuild it).",
		);
	} else {
		writeIndex(results);
	}
	const mb = (dirBytes(RENDER_DIR) / 1024 / 1024).toFixed(1);
	console.log(
		`renders/: ${mb} MB → ${path.relative(ROOT, RENDER_DIR)}/INDEX.md`,
	);
	if (failed) process.exit(1);
}

await main();
