#!/usr/bin/env node
/**
 * Renders every screen and state on the web target (in-memory fixtures, see
 * `*.web.ts` in the repositories/) in one run, diffs each against its approved
 * baseline, and writes one report putting mockup, current render, baseline
 * and diff side by side for every state across all features.
 *
 *   npm run visual-check                          # every state, diff + report
 *   npm run visual-check -- new-habit reminders   # just these
 *   npm run visual-check -- --update-baseline     # accept current renders
 *   npm run visual-check -- --list                # state names + mockups
 *
 * Two different comparisons, on purpose:
 * - **Baseline (automated, pass/fail).** docs/visual-baseline/<state>.png is
 *   the last render someone looked at and approved. Any state that drifts
 *   from it fails the run — so a shared component change (the Container fix
 *   in HAB-12, say) surfaces on every screen it touched, not only on the one
 *   feature it was made for. Intended changes: review them in the report,
 *   then `--update-baseline` and commit the new PNGs with the change.
 * - **Mockup (by eye, in the report).** docs/mockups/ are design drawings —
 *   device frame, SF Symbols, SF Pro — so a pixel diff against them is
 *   meaningless. The report puts each one next to its render instead.
 *
 * Reuses a dev server already running at VISUAL_CHECK_URL (default
 * http://localhost:8081); otherwise starts `npx expo start --web` and stops it
 * afterwards. Output lands in .visual-checks/ (gitignored): current/, diff/,
 * report.html.
 */
import fs from "node:fs";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
	BASE_URL,
	ensureServer,
	libraryPath,
	ROOT,
	stopServer,
	warmBundle,
} from "./lib/dev-server.mjs";
import { DEFAULT_CLOCK, SCREENS } from "./visual-check/screens.mjs";

const OUT_DIR = path.join(ROOT, ".visual-checks");
const CURRENT_DIR = path.join(OUT_DIR, "current");
const DIFF_DIR = path.join(OUT_DIR, "diff");
const BASELINE_DIR = path.join(ROOT, "docs/visual-baseline");
const REPORT = path.join(OUT_DIR, "report.html");

// iPhone 15/16 logical size — the mockups are drawn on this frame.
const VIEWPORT = { width: 393, height: 852 };
// Four Chromium pages at once starved the popover's measurement chain (audit
// A10-10); two keeps the full run fast enough and the layout settling reliable.
const CONCURRENCY = 2;

/**
 * Per-pixel colour tolerance (pixelmatch's 0–1 scale). Deliberately far below
 * pixelmatch's 0.1 default: cards are white on a #F4F3F1 background, a ~4%
 * contrast step the default treats as "same colour" — so a card's radius or
 * padding could change without a single pixel counting. Repeat renders are
 * pixel-identical, so there's no noise to absorb here.
 */
const PIXEL_THRESHOLD = 0.02;
/**
 * Differing pixels a state may have and still pass. Repeat runs of an
 * unchanged app diff at exactly 0; the smallest real change seen (one card's
 * corner radius, 16 → 12, on the retro-log sheet) was 127px.
 */
const MAX_DIFF_PIXELS = 10;

/**
 * Dynamic Type AX3 (08.6a): every text element's size is mapped to the value the
 * handoff gives for that token (display 32 → 52, stat 26 → 48, title 20 → 43,
 * body-lg 17 → 40, body 16 → 38, callout 15 → 36, subhead 14 → 36, footnote
 * 13 → 33, caption 12 → 32); sizes off the ramp scale by the nearest ratio.
 * Line height follows. A MutationObserver re-applies it to text React adds
 * later (a sheet opening, a toast), so the capture is consistent.
 */
async function emulateAx3Type(page) {
	await page.evaluate(() => {
		const RAMP = {
			32: 52,
			26: 48,
			20: 43,
			17: 40,
			16: 38,
			15: 36,
			14: 36,
			13: 33,
			12: 32,
		};
		const scaleOf = (px) => {
			const exact = RAMP[Math.round(px)];
			if (exact) return exact / Math.round(px);
			const keys = Object.keys(RAMP).map(Number);
			const nearest = keys.reduce((a, b) =>
				Math.abs(b - px) < Math.abs(a - px) ? b : a,
			);
			return RAMP[nearest] / nearest;
		};
		const apply = () => {
			for (const el of document.querySelectorAll(
				"div,span,input,textarea,h1,h2,h3,h4,h5,h6,p,a,label,li,button",
			)) {
				// iOS keeps the tab bar's labels at 12 pt whatever the setting (08.6).
				// The week matrix's day letters and the cells' numbers are drawn with
				// allowFontScaling={false}; react-native-web cannot say so, so skip them.
				if (
					el.closest(
						'[data-testid^="tab-bar"],[data-testid^="completion-cell"],[data-testid^="week-matrix-day"]',
					)
				)
					continue;
				const hasText =
					el.tagName === "INPUT" ||
					el.tagName === "TEXTAREA" ||
					[...el.childNodes].some(
						(n) => n.nodeType === 3 && n.textContent.trim(),
					);
				if (!hasText) continue;
				// React may rewrite an inline style later: keep the original size and
				// put the scaled one back whenever it is missing.
				const base = el.dataset.ax3Base
					? Number(el.dataset.ax3Base)
					: parseFloat(getComputedStyle(el).fontSize);
				el.dataset.ax3Base = String(base);
				// The inline bar and the header pills cap Dynamic Type at 1.3x
				// (maxFontSizeMultiplier), as iOS's own navigation bars hold theirs.
				const capped = el.closest(
					'[data-testid$="inline-bar"],[data-testid="header-pill"]',
				);
				const k = capped ? Math.min(scaleOf(base), 1.3) : scaleOf(base);
				if (
					Math.abs(parseFloat(getComputedStyle(el).fontSize) - base * k) < 0.5
				)
					continue;
				const line = Number(
					el.dataset.ax3Line ?? parseFloat(getComputedStyle(el).lineHeight),
				);
				if (!Number.isNaN(line)) el.dataset.ax3Line = String(line);
				el.style.fontSize = `${base * k}px`;
				if (!Number.isNaN(line)) el.style.lineHeight = `${line * k}px`;
			}
		};
		apply();
		new MutationObserver(apply).observe(document.body, {
			childList: true,
			subtree: true,
		});
	});
}

/**
 * `VC_AUDIT=1 npm run visual-check` also writes `.visual-checks/audit/<name>.json`
 * (HAB-49): every pressable's rendered size and every text that is cut off or
 * clipped by its box, read from the live DOM at the state's final frame. It is
 * the evidence behind the V3-6 touch-target and Dynamic Type audits; the
 * committed guard (`touch-targets.guard.test.ts`) is the static twin.
 */
async function auditPage(page, name) {
	const data = await page.evaluate(() => {
		const label = (el) =>
			(
				el.getAttribute("aria-label") ||
				el.textContent ||
				el.getAttribute("data-testid") ||
				""
			)
				.trim()
				.replace(/\s+/g, " ")
				.slice(0, 60);
		const visible = (el) => {
			const r = el.getBoundingClientRect();
			const st = getComputedStyle(el);
			return (
				r.width > 0 &&
				r.height > 0 &&
				st.visibility !== "hidden" &&
				st.display !== "none"
			);
		};
		const targets = [
			...document.querySelectorAll(
				'[role="button"],[role="link"],[role="tab"],[role="switch"],[role="checkbox"],[role="radio"],[role="slider"],button,a[href]',
			),
		]
			.filter(visible)
			.map((el) => {
				const r = el.getBoundingClientRect();
				return {
					label: label(el),
					role: el.getAttribute("role") || el.tagName.toLowerCase(),
					w: Math.round(r.width * 10) / 10,
					h: Math.round(r.height * 10) / 10,
					x: Math.round(r.x),
					y: Math.round(r.y),
					disabled: el.getAttribute("aria-disabled") === "true",
				};
			});
		const clipped = [];
		for (const el of document.querySelectorAll(
			"div,span,h1,h2,h3,h4,h5,h6,p,a,label,li,button",
		)) {
			if (!el.childNodes.length || !visible(el)) continue;
			const hasText = [...el.childNodes].some(
				(n) => n.nodeType === 3 && n.textContent.trim(),
			);
			if (!hasText) continue;
			const st = getComputedStyle(el);
			const lineClamp =
				st.webkitLineClamp !== "none" || st.textOverflow === "ellipsis";
			const overflowX = el.scrollWidth > el.clientWidth + 1;
			const overflowY = el.scrollHeight > el.clientHeight + 1;
			if (
				(overflowX || overflowY) &&
				(lineClamp || st.overflow !== "visible")
			) {
				clipped.push({
					text: label(el),
					kind: lineClamp ? "truncated" : "clipped",
					box: `${el.clientWidth}x${el.clientHeight}`,
					content: `${el.scrollWidth}x${el.scrollHeight}`,
				});
			}
		}
		const vw = document.documentElement.clientWidth;
		const offscreen = [
			...document.querySelectorAll("div,span,h1,h2,h3,h4,h5,h6,p"),
		]
			.filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1)
			.filter((el) => !el.closest('[data-testid*="scroll"]'))
			.slice(0, 5)
			.map((el) => ({
				text: label(el),
				right: Math.round(el.getBoundingClientRect().right),
			}));
		return { targets, clipped, offscreen, viewport: vw };
	});
	const dir = path.join(OUT_DIR, "audit");
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(
		path.join(dir, `${name}.json`),
		JSON.stringify(data, null, 1),
	);
}

async function capture(browser, name, screen) {
	const clock = screen.clock ?? DEFAULT_CLOCK;
	const page = await browser.newPage({
		viewport: screen.viewport ?? VIEWPORT,
		deviceScaleFactor: 2,
		colorScheme: screen.colorScheme ?? "light",
		hasTouch: Boolean(screen.touch),
	});
	const problems = [];
	page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
	page.on("console", (msg) => {
		if (
			msg.type() === "error" &&
			!screen.ignoreErrors?.some((pattern) => pattern.test(msg.text()))
		) {
			problems.push(`console.error: ${msg.text()}`);
		}
	});

	try {
		// Start the page's clock (local time) at the pinned moment before anything
		// loads — fixtures and screens compute "today" from it. It must keep
		// running: `setFixedTime` froze React's own clock, so a lazily loaded
		// route never got past its Suspense fallback ("Bundling…") and every such
		// state was captured blank.
		await page.clock.setSystemTime(new Date(clock));

		// The first hit on a route can wait on a Metro bundle, hence the long timeout.
		await page.goto(`${BASE_URL}${screen.route}`, {
			waitUntil: "networkidle",
			timeout: 180_000,
		});
		await page.waitForFunction(
			() => document.querySelector("#root")?.childElementCount > 0,
		);
		await page.evaluate(() => document.fonts.ready);
		// Let hydration + fixture-driven re-renders and screen transitions settle.
		await page.waitForTimeout(800);

		// A state only reachable by a tap or gesture (a sheet, a toast, a
		// mid-drag row) — a static route load can't show it, so simulate it.
		if (screen.interact) {
			await screen.interact(page, { clock });
			await page.waitForTimeout(500);
		}

		// react-native-web has no Dynamic Type, so `?textSize=ax` only switches the
		// layouts; scale the type itself to the AX3 sizes before looking.
		if (/[?&]textSize=ax\b/.test(screen.route)) {
			await emulateAx3Type(page);
			await page.waitForTimeout(400);
		}
		if (process.env.VC_AUDIT) await auditPage(page, name);

		await page.screenshot({
			path: path.join(CURRENT_DIR, `${name}.png`),
			caret: "hide",
			animations: "disabled",
		});
	} catch (err) {
		problems.push(`capture failed: ${err.message.split("\n")[0]}`);
	} finally {
		await page.close();
	}
	return problems;
}

function readPng(file) {
	return PNG.sync.read(fs.readFileSync(file));
}

/** Compares a state's current render with its baseline; writes a diff image when they differ. */
function compare(name) {
	const current = path.join(CURRENT_DIR, `${name}.png`);
	const baseline = path.join(BASELINE_DIR, `${name}.png`);
	if (!fs.existsSync(current)) return { status: "error" };
	if (!fs.existsSync(baseline)) return { status: "new" };

	const a = readPng(baseline);
	const b = readPng(current);
	if (a.width !== b.width || a.height !== b.height) {
		return {
			status: "changed",
			detail: `size ${a.width}×${a.height} → ${b.width}×${b.height}`,
		};
	}
	const diff = new PNG({ width: a.width, height: a.height });
	const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
		threshold: PIXEL_THRESHOLD,
	});
	if (pixels <= MAX_DIFF_PIXELS) return { status: "same", pixels };
	fs.writeFileSync(path.join(DIFF_DIR, `${name}.png`), PNG.sync.write(diff));
	const percent = ((pixels / (a.width * a.height)) * 100).toFixed(2);
	return {
		status: "changed",
		pixels,
		detail: `${pixels} px differ (${percent}%)`,
	};
}

async function runPool(items, worker) {
	const queue = [...items];
	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
			while (queue.length > 0) await worker(queue.shift());
		}),
	);
}

function escapeHtml(text) {
	return String(text)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/** Relative URL from the report to a repo file. */
function fromReport(file) {
	return path
		.relative(OUT_DIR, file)
		.split(path.sep)
		.map(encodeURIComponent)
		.join("/");
}

function writeReport(results) {
	const label = {
		same: "matches baseline",
		changed: "changed",
		new: "no baseline",
		error: "failed",
	};
	const counts = Object.groupBy(results, (result) => result.status);
	const cell = (file, caption) =>
		file && fs.existsSync(file)
			? `<figure><a href="${fromReport(file)}"><img loading="lazy" src="${fromReport(file)}" alt="${escapeHtml(caption)}"></a><figcaption>${escapeHtml(caption)}</figcaption></figure>`
			: `<figure class="empty"><div>—</div><figcaption>${escapeHtml(caption)}</figcaption></figure>`;

	const groups = Object.groupBy(results, (result) => result.screen.feature);
	const sections = Object.entries(groups)
		.map(
			([feature, items]) => `
<section><h2>${escapeHtml(feature)}</h2>
${items
	.map(
		({ name, screen, status, detail, problems }) => `
<article class="${status}">
  <header><h3>${escapeHtml(name)}</h3><span class="badge">${label[status]}</span>
  ${detail ? `<span class="detail">${escapeHtml(detail)}</span>` : ""}</header>
  <p class="meta"><code>${escapeHtml(screen.route)}</code> · clock ${escapeHtml(screen.clock ?? DEFAULT_CLOCK)}${screen.note ? ` — ${escapeHtml(screen.note)}` : ""}</p>
  ${problems.length ? `<ul class="problems">${problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>` : ""}
  <div class="row">
    ${cell(screen.mockup && path.join(ROOT, screen.mockup), screen.mockup ? `Mockup · ${path.basename(screen.mockup)}` : "No mockup for this state")}
    ${cell(path.join(CURRENT_DIR, `${name}.png`), "Current")}
    ${cell(path.join(BASELINE_DIR, `${name}.png`), "Baseline")}
    ${status === "changed" ? cell(path.join(DIFF_DIR, `${name}.png`), "Diff (red = changed)") : ""}
  </div>
</article>`,
	)
	.join("")}
</section>`,
		)
		.join("");

	const summary = Object.entries(label)
		.filter(([status]) => counts[status])
		.map(
			([status, text]) =>
				`<span class="badge ${status}">${counts[status].length} ${text}</span>`,
		)
		.join(" ");

	fs.writeFileSync(
		REPORT,
		`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visual check</title>
<style>
  :root { --bg:#f4f3f1; --card:#fff; --ink:#1b1b1a; --sub:#6b6a66; --line:#e2e1de; --ok:#1f7a4a; --warn:#a15c00; --bad:#b3261e; }
  body { margin:0; padding:24px 16px 64px; background:var(--bg); color:var(--ink); font:14px/1.45 system-ui,sans-serif; }
  h1 { font-size:22px; margin:0 0 8px; } h2 { font-size:16px; margin:32px 0 12px; }
  h3 { font-size:15px; margin:0; }
  article { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:16px; }
  article.changed, article.error { border-color:var(--bad); } article.new { border-color:var(--warn); }
  header { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .badge { font-size:12px; padding:2px 8px; border-radius:999px; background:var(--line); }
  .same .badge, .badge.same { background:#dcefe3; color:var(--ok); }
  .changed .badge, .error .badge, .badge.changed, .badge.error { background:#f7dcda; color:var(--bad); }
  .new .badge, .badge.new { background:#f8e7cc; color:var(--warn); }
  .detail, .meta { color:var(--sub); font-size:12px; } .meta { margin:6px 0 12px; }
  .problems { color:var(--bad); font-size:12px; }
  .row { display:flex; gap:12px; overflow-x:auto; align-items:flex-start; }
  figure { margin:0; flex:0 0 auto; } figure img { height:420px; border:1px solid var(--line); border-radius:8px; display:block; }
  figure.empty div { height:420px; width:120px; display:grid; place-items:center; color:var(--sub); border:1px dashed var(--line); border-radius:8px; }
  figcaption { font-size:12px; color:var(--sub); margin-top:4px; max-width:260px; }
</style></head><body>
<h1>Visual check — ${results.length} states</h1>
<p>${summary}</p>
<p class="meta">Baseline diff is the pass/fail signal. Mockups are for judging by eye — they're drawings, not renders.</p>
${sections}
</body></html>
`,
	);
}

async function main() {
	const args = process.argv.slice(2);

	if (args.includes("--list")) {
		for (const [name, screen] of Object.entries(SCREENS)) {
			console.log(
				`${screen.feature.padEnd(7)} ${name.padEnd(30)} ${screen.route.padEnd(44)} ${screen.mockup ?? "-"}`,
			);
		}
		return;
	}

	const updateBaseline = args.includes("--update-baseline");
	const names = args.filter((arg) => !arg.startsWith("--"));
	const selected = names.length > 0 ? names : Object.keys(SCREENS);
	const unknown = selected.filter((name) => !(name in SCREENS));
	if (unknown.length > 0) {
		console.error(`Unknown screen(s): ${unknown.join(", ")}. Try --list.`);
		process.exit(1);
	}

	process.env.LD_LIBRARY_PATH = libraryPath();
	const { chromium } = await import("playwright");

	fs.rmSync(CURRENT_DIR, { recursive: true, force: true });
	fs.rmSync(DIFF_DIR, { recursive: true, force: true });
	for (const dir of [CURRENT_DIR, DIFF_DIR, BASELINE_DIR]) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const server = await ensureServer();
	const problemsByName = new Map();
	try {
		await warmBundle();
		const browser = await chromium.launch();
		try {
			await runPool(selected, async (name) => {
				let problems = await capture(browser, name, SCREENS[name]);
				// One retry for a state that fails — a flake clears, a real change
				// (or a real error) fails twice. Not when rewriting baselines.
				if (!updateBaseline) {
					const first = compare(name).status;
					if (problems.length > 0 || first === "changed") {
						problems = await capture(browser, name, SCREENS[name]);
					}
				}
				problemsByName.set(name, problems);
			});
		} finally {
			await browser.close();
		}
	} finally {
		stopServer(server);
	}

	if (updateBaseline) {
		for (const name of selected) {
			const current = path.join(CURRENT_DIR, `${name}.png`);
			if (problemsByName.get(name).length === 0 && fs.existsSync(current)) {
				fs.copyFileSync(current, path.join(BASELINE_DIR, `${name}.png`));
			}
		}
		console.log(`Baseline updated for ${selected.length} state(s).`);
	}

	const results = selected.map((name) => {
		const problems = problemsByName.get(name);
		const comparison = compare(name);
		return {
			name,
			screen: SCREENS[name],
			problems,
			...comparison,
			status: problems.length > 0 ? "error" : comparison.status,
		};
	});
	writeReport(results);

	for (const { name, status, detail, problems } of results) {
		const mark = { same: "✓", changed: "✗", new: "?", error: "!" }[status];
		console.log(
			`${mark} ${name.padEnd(30)} ${status}${detail ? ` — ${detail}` : ""}`,
		);
		for (const problem of problems) console.log(`    ${problem}`);
	}
	const failing = results.filter((result) => result.status !== "same");
	console.log(
		`\n${results.length - failing.length}/${results.length} match baseline. Report: ${path.relative(ROOT, REPORT)}`,
	);
	if (failing.some((result) => result.status === "new")) {
		console.log(
			"States with no baseline: review them in the report, then run with --update-baseline.",
		);
	}
	if (failing.length > 0) process.exitCode = 1;
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
