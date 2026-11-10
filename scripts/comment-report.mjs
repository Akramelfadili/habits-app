#!/usr/bin/env node
// Prints the 15 files with the highest share of comment lines and the comment
// totals per folder (not part of `make check`).
//
//   node scripts/comment-report.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { trackedSources } from "./check-comment-refs.mjs";
import { scanSource } from "./lib/comments.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function folderOf(file) {
	return path.dirname(file).split("/").slice(0, 4).join("/");
}

export function reportFor(files) {
	const rows = files.map(({ file, text }) => {
		const { comments } = scanSource(file, text);
		const commentLines = comments.reduce(
			(sum, c) => sum + (c.endLine - c.line + 1),
			0,
		);
		const lines = text.split("\n").length;
		return { file, commentLines, lines, ratio: commentLines / lines };
	});
	const folders = new Map();
	for (const r of rows) {
		const key = folderOf(r.file);
		const f = folders.get(key) ?? { commentLines: 0, lines: 0, files: 0 };
		f.commentLines += r.commentLines;
		f.lines += r.lines;
		f.files += 1;
		folders.set(key, f);
	}
	const top = rows
		.filter((r) => r.lines >= 20)
		.sort((a, b) => b.ratio - a.ratio)
		.slice(0, 15);
	return {
		top,
		folders: [...folders].sort((a, b) => b[1].commentLines - a[1].commentLines),
	};
}

function main() {
	const files = trackedSources().map((file) => ({
		file,
		text: fs.readFileSync(path.join(ROOT, file), "utf8"),
	}));
	const { top, folders } = reportFor(files);
	console.log("Highest comment ratio (files of 20+ lines):");
	for (const r of top)
		console.log(
			`  ${(r.ratio * 100).toFixed(0).padStart(3)}%  ${String(r.commentLines).padStart(4)}/${String(r.lines).padEnd(5)} ${r.file}`,
		);
	console.log("\nComment lines per folder:");
	for (const [folder, f] of folders)
		console.log(
			`  ${String(f.commentLines).padStart(5)} of ${String(f.lines).padEnd(6)} ${folder} (${f.files} files)`,
		);
	const total = folders.reduce((s, [, f]) => s + f.commentLines, 0);
	console.log(`\nTotal comment lines: ${total}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
