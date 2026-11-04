#!/usr/bin/env node
/**
 * One HTML contact sheet per run: each web baseline (docs/visual-baseline)
 * next to its simulator screenshot, and a list of what is missing and why.
 *
 *   node contact-sheet.mjs --shots shots [--logs logs] --out contact-sheet \
 *     [--summary "$GITHUB_STEP_SUMMARY"] [--width 300]
 *
 * Not a pixel diff: fonts, SF Symbols and rendering differ on purpose, so the
 * sheet is for a person to look at. Images are shrunk to thumbnails (JPEG,
 * `sharp` when installed, else copied as they are) to keep the artifact small;
 * the full-size PNGs are in the shots-* artifacts.
 */
import fs from "node:fs";
import path from "node:path";
import { buildPlan, coverage } from "./plan.mjs";
import { appendSummary, parseArgs } from "./sh.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BASELINES = path.join(ROOT, "docs/visual-baseline");
export const ROOT_BASELINES = BASELINES;

function walk(dir, found = []) {
	if (!dir || !fs.existsSync(dir)) return found;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(file, found);
		else found.push(file);
	}
	return found;
}

const escapeHtml = (text) =>
	String(text ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

function dirSize(dir) {
	return walk(dir).reduce((sum, file) => sum + fs.statSync(file).size, 0);
}

/** What each state's capture did, from the shards' results.json files. */
function readResults(logsDir) {
	const results = new Map();
	for (const file of walk(logsDir).filter((f) => f.endsWith("results.json"))) {
		try {
			for (const r of JSON.parse(fs.readFileSync(file, "utf8"))) {
				if (r.name) results.set(r.name, r);
			}
		} catch {
			// A damaged log only loses its notes.
		}
	}
	return results;
}

export async function buildSheet({ shots, logs, out, width = 300, summary }) {
	let sharp = null;
	try {
		sharp = (await import("sharp")).default;
	} catch {
		console.warn("sharp is not installed: thumbnails are copied at full size.");
	}
	const shotFiles = new Map(
		walk(shots)
			.filter((f) => f.endsWith(".png"))
			.map((f) => [path.basename(f, ".png"), f]),
	);
	const results = readResults(logs);
	const plan = await buildPlan();
	const report = coverage(plan);

	fs.rmSync(out, { recursive: true, force: true });
	const imgDir = path.join(out, "img");
	fs.mkdirSync(path.join(imgDir, "web"), { recursive: true });
	fs.mkdirSync(path.join(imgDir, "ios"), { recursive: true });

	async function thumb(source, kind, name) {
		if (!source || !fs.existsSync(source)) return null;
		if (sharp) {
			const target = `img/${kind}/${name}.jpg`;
			await sharp(source)
				.resize({ width, withoutEnlargement: true })
				.jpeg({ quality: 62, mozjpeg: true })
				.toFile(path.join(out, target));
			return target;
		}
		const target = `img/${kind}/${name}.png`;
		fs.copyFileSync(source, path.join(out, target));
		return target;
	}

	const rows = [];
	for (const item of plan) {
		const web = await thumb(
			path.join(BASELINES, `${item.name}.png`),
			"web",
			item.name,
		);
		const ios = await thumb(shotFiles.get(item.name), "ios", item.name);
		const result = results.get(item.name);
		let status = "captured";
		if (item.status === "unsupported") status = "not reproducible";
		else if (!ios) status = "missing";
		else if (result && result.status !== "captured") status = result.status;
		rows.push({ item, web, ios, result, status });
	}

	const missing = rows.filter((r) => r.status === "missing");
	const flagged = rows.filter((r) =>
		["partial", "blank", "failed"].includes(r.status),
	);
	const unsupported = rows.filter((r) => r.status === "not reproducible");
	const captured = rows.filter((r) => r.ios);
	const extras = [...shotFiles.keys()].filter(
		(name) => !plan.some((i) => i.name === name),
	);

	const cell = (src, label) =>
		src
			? `<figure><img loading="lazy" src="${src}" alt="${escapeHtml(label)}"><figcaption>${label}</figcaption></figure>`
			: `<figure class="none"><div>—</div><figcaption>${label}</figcaption></figure>`;

	const byFeature = Object.groupBy(rows, (r) => r.item.feature);
	const sections = Object.entries(byFeature)
		.map(
			([feature, list]) =>
				`<section><h2>${escapeHtml(feature)}</h2>${list
					.map((r) => {
						const notes = [
							r.item.reason && `Not reproduced: ${r.item.reason}`,
							...(r.item.caveats ?? []),
							...(r.result?.notes ?? []).filter(
								(n) => !(r.item.caveats ?? []).includes(n),
							),
						].filter(Boolean);
						return `<article class="${r.status.replaceAll(" ", "-")}" data-name="${escapeHtml(r.item.name)}" data-status="${r.status}">
<header><h3>${escapeHtml(r.item.name)}</h3><span class="badge">${r.status}</span><span class="shard">${r.item.shard}</span></header>
<div class="pair">${cell(r.web, "Web baseline")}${cell(r.ios, "Simulator")}</div>
${notes.length ? `<ul>${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>` : ""}
</article>`;
					})
					.join("")}</section>`,
		)
		.join("");

	const list = (title, items, describe) =>
		items.length
			? `<details><summary>${title} (${items.length})</summary><ul>${items.map((r) => `<li><code>${escapeHtml(r.item.name)}</code> — ${escapeHtml(describe(r))}</li>`).join("")}</ul></details>`
			: "";

	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Device validation — contact sheet</title>
<style>
:root{color-scheme:light dark;--bg:#f4f3f1;--ink:#1b1b1b;--card:#fff;--line:#d9d6d0;--warn:#b45309;--bad:#b91c1c;--ok:#15803d}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--ink:#eee;--card:#222;--line:#3a3a3a}}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:14px/1.4 system-ui,sans-serif}
h1{margin:0 0 4px}h2{margin:28px 0 8px;border-bottom:1px solid var(--line)}h3{margin:0;font-size:14px}
.top{position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:2;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
input,select{font:inherit;padding:4px 8px}
section{display:grid;grid-template-columns:repeat(auto-fill,minmax(640px,1fr));gap:12px}section>h2{grid-column:1/-1}
article{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px}
article header{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.badge{font-size:11px;padding:1px 8px;border-radius:99px;border:1px solid var(--line)}
article.missing .badge,article.failed .badge,article.blank .badge{color:var(--bad);border-color:var(--bad)}
article.partial .badge,article.not-reproducible .badge{color:var(--warn);border-color:var(--warn)}
article.captured .badge{color:var(--ok);border-color:var(--ok)}
.shard{font-size:11px;opacity:.6}
.pair{display:flex;gap:10px;margin-top:8px}figure{margin:0;flex:1;text-align:center}
img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:6px}
figure.none div{height:120px;display:grid;place-items:center;border:1px dashed var(--line);border-radius:6px}
figcaption{font-size:11px;opacity:.7;margin-top:2px}ul{margin:6px 0 0 18px;padding:0;font-size:12px}
details{margin:6px 0}
</style></head><body>
<h1>Device validation — contact sheet</h1>
<p>${report.total} states in the web registry · <b>${captured.length}</b> captured on the simulator · ${missing.length} missing · ${flagged.length} flagged · ${unsupported.length} not reproducible on native · ${extras.length} extra.
Thumbnails only (${width}px); full-size PNGs are in the <code>shots-*</code> artifacts. Fonts, SF Symbols and rendering differ from the web on purpose: look, don't diff.</p>
${list("Missing", missing, (r) => r.result?.notes?.at(-1) ?? "no screenshot was produced")}
${list("Flagged", flagged, (r) => `${r.status}: ${r.result?.notes?.at(-1) ?? ""}`)}
${list("Not reproducible on native", unsupported, (r) => r.item.reason)}
<div class="top"><input id="q" placeholder="Filter by name" size="28"><select id="s"><option value="">All</option><option>captured</option><option>missing</option><option>partial</option><option>blank</option><option>failed</option><option>not reproducible</option></select></div>
${sections}
<script>
const q=document.getElementById("q"),s=document.getElementById("s");
function apply(){for(const a of document.querySelectorAll("article")){const ok=a.dataset.name.includes(q.value.trim())&&(!s.value||a.dataset.status===s.value);a.style.display=ok?"":"none"}}
q.oninput=s.onchange=apply;
</script></body></html>`;
	fs.writeFileSync(path.join(out, "index.html"), html);
	fs.writeFileSync(
		path.join(out, "missing.json"),
		JSON.stringify(
			{
				total: report.total,
				captured: captured.length,
				missing: missing.map((r) => r.item.name),
				flagged: flagged.map((r) => ({ name: r.item.name, status: r.status })),
				notReproducible: unsupported.map((r) => ({
					name: r.item.name,
					reason: r.item.reason,
				})),
				extra: extras,
			},
			null,
			2,
		),
	);

	const sizeMb = (dirSize(out) / 1e6).toFixed(1);
	const lines = [
		"### Contact sheet",
		`- ${captured.length} of ${report.total} states captured on the simulator; ${missing.length} missing, ${flagged.length} flagged, ${unsupported.length} not reproducible on native.`,
		`- Artifact size: ${sizeMb} MB (thumbnails; full-size PNGs are in the shots-* artifacts).`,
		...(missing.length
			? [
					`- Missing: ${missing
						.slice(0, 25)
						.map((r) => `\`${r.item.name}\``)
						.join(
							", ",
						)}${missing.length > 25 ? ` … and ${missing.length - 25} more (missing.json)` : ""}`,
				]
			: []),
	];
	console.log(lines.join("\n"));
	appendSummary(summary, lines.join("\n"));
	return { captured: captured.length, missing: missing.length, sizeMb };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const args = parseArgs(process.argv.slice(2));
	await buildSheet({
		shots: String(args.shots ?? "shots"),
		logs: args.logs ? String(args.logs) : String(args.shots ?? "shots"),
		out: String(args.out ?? "contact-sheet"),
		width: Number(args.width ?? 300),
		summary: args.summary,
	});
}
