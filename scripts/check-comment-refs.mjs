#!/usr/bin/env node
// Fails on a ticket id or spec-version word in a comment or test title.
// The allowlist ({ path: count }) may only shrink; stale entries also fail.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanSource } from "./lib/comments.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const FORBIDDEN = /\bHAB-\d+|\bV[123]\b/;

const SOURCE = /\.(ts|tsx|js|mjs|cjs)$/;
const SKIPPED = [/^src\/lib\/db\/migrations\//, /^expo-env\.d\.ts$/];

export function findHits(file, text) {
	const { comments, titles } = scanSource(file, text);
	const hits = [];
	for (const c of comments) {
		if (FORBIDDEN.test(c.text))
			hits.push({ file, line: c.line, what: "comment", text: c.text });
	}
	for (const t of titles) {
		if (FORBIDDEN.test(t.text))
			hits.push({ file, line: t.line, what: "test title", text: t.text });
	}
	return hits;
}

/** Compares hit counts per file with the allowlist; returns the problems. */
export function checkAgainstAllowlist(hits, allowlist) {
	const counts = new Map();
	for (const h of hits) counts.set(h.file, (counts.get(h.file) ?? 0) + 1);
	const problems = [];
	for (const [file, count] of counts) {
		const allowed = allowlist[file] ?? 0;
		if (count > allowed) {
			for (const h of hits.filter((x) => x.file === file))
				problems.push(
					`${file}:${h.line}: ${h.what} has a ticket id or spec-version word: ${h.text.split("\n")[0].trim()}`,
				);
		}
	}
	for (const [file, allowed] of Object.entries(allowlist)) {
		const count = counts.get(file) ?? 0;
		if (count < allowed)
			problems.push(
				`${file}: allowlisted for ${allowed} but has ${count}; lower or remove the entry`,
			);
	}
	return problems;
}

export function trackedSources() {
	return execFileSync("git", ["ls-files", "src", "scripts"], {
		cwd: ROOT,
		encoding: "utf8",
	})
		.split("\n")
		.filter((f) => SOURCE.test(f) && !SKIPPED.some((re) => re.test(f)));
}

function main() {
	const allowlist = JSON.parse(
		fs.readFileSync(
			path.join(ROOT, "scripts/check-comment-refs.allowlist.json"),
			"utf8",
		),
	);
	const hits = trackedSources().flatMap((file) =>
		findHits(file, fs.readFileSync(path.join(ROOT, file), "utf8")),
	);
	const problems = checkAgainstAllowlist(hits, allowlist);
	if (problems.length) {
		console.error(problems.join("\n"));
		console.error(`check-comment-refs: ${problems.length} problem(s)`);
		process.exit(1);
	}
	console.log("check-comment-refs: ok");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
