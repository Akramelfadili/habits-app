#!/usr/bin/env node
// Repo hygiene guard. The repo is PUBLIC, so this fails if any TRACKED file is
// something that must never be committed: secrets, env files, signing
// material, logs, OS/editor junk, archives, generated output, node_modules,
// ios/ or android/. It also fails on a tracked file over 1 MB (outside the
// explicit allowlist below) and on obvious secrets inside text files.
//
//   node scripts/check-repo-hygiene.mjs        check the tracked files
//
// Fast: `git ls-files` plus a read of each tracked text file. The checks are
// exported as pure functions so the tests use synthetic file lists.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_BYTES = 1024 * 1024;

// Tracked files may exceed MAX_BYTES only here. Keep this short; each entry
// is a path regex with the reason it is allowed.
export const SIZE_ALLOWLIST = [
	[/^docs\/visual-baseline\//, "visual-check baselines"],
	// Exported mockup bundles and their runtime.
	[/^docs\/mockups\/v3\/[^/]+\.dc\.html$/, "V3 mockup design exports"],
	[/^docs\/mockups\/v3\/support\.js$/, "V3 mockup runtime"],
	[/^assets\//, "app assets"],
	[/^package-lock\.json$/, "npm lockfile"],
];

export const FORBIDDEN_PATHS = [
	[/(^|\/)node_modules\//, "node_modules"],
	[/^(ios|android)\//, "generated native folder (ios/, android/)"],
	[
		/(^|\/)\.env($|\.)(?!(local\.)?example$)/,
		"env file (only .env.example and .env.local.example may be tracked)",
	],
	[
		/\.(pem|p8|p12|key|mobileprovision|keystore|jks|cer|certSigningRequest)$/i,
		"secret or signing material",
	],
	[
		/(^|\/)(google-services\.json|GoogleService-Info\.plist)$/,
		"Firebase/Google service config",
	],
	[/(^|\/)service-account[^/]*\.json$/i, "service account credentials"],
	[/\.log$|(^|\/)(npm|yarn|pnpm)-debug\.log/, "log file"],
	[/(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/, "OS file"],
	[/(^|\/)\.idea\/|\.(swp|swo)$/, "editor file"],
	[
		/^\.vscode\/(?!(extensions|settings)\.json$)/,
		"editor file (only .vscode/extensions.json and settings.json)",
	],
	[/\.(zip|tgz|tar\.gz)$/i, "archive"],
	[
		/(^|\/)(\.expo|dist|web-build|build|coverage|\.jest-cache|\.metro-cache|\.visual-checks|\.e2e-output|tmp|scratch)\//,
		"generated output or scratch folder",
	],
	[
		/\.(tsbuildinfo|bak|orig|rej)$|(^|\/)(expo-env\.d\.ts|\.eslintcache)$/,
		"generated or scratch file",
	],
	[/^docs\/mockups\/v3\/renders\/.*\.png$/, "generated mockup slice"],
];

// Obvious secrets in text files. Built so this file does not match itself.
export const SECRET_PATTERNS = [
	[/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key header"],
	[/\b(AKIA|ASIA)[0-9A-Z]{16}\b/, "AWS access key id"],
	[/\bAIza[0-9A-Za-z_-]{35}\b/, "Google API key"],
	[/\bgh[pousr]_[0-9A-Za-z]{36,}\b/, "GitHub token"],
	[/\bgithub_pat_[0-9A-Za-z_]{22,}\b/, "GitHub fine-grained token"],
	[/\bpassword\s*[:=]\s*["'][^"'\s]{4,}["']/i, "literal password"],
];

const BINARY_EXT =
	/\.(png|jpe?g|webp|gif|icns|ico|ttf|otf|woff2?|mp4|mov|pdf|sqlite|db)$/i;

export function checkPaths(files) {
	const problems = [];
	for (const f of files) {
		for (const [re, why] of FORBIDDEN_PATHS) {
			if (re.test(f)) {
				problems.push(`${f}: ${why}`);
				break;
			}
		}
	}
	return problems;
}

export function checkSizes(entries) {
	const problems = [];
	for (const { path: f, size } of entries) {
		if (size <= MAX_BYTES) continue;
		if (SIZE_ALLOWLIST.some(([re]) => re.test(f))) continue;
		problems.push(
			`${f}: ${(size / MAX_BYTES).toFixed(1)} MB exceeds 1 MB and is not allowlisted`,
		);
	}
	return problems;
}

export function checkContent(file, text) {
	if (BINARY_EXT.test(file) || text.includes("\0")) return [];
	const problems = [];
	for (const [re, why] of SECRET_PATTERNS) {
		if (re.test(text)) problems.push(`${file}: looks like a ${why}`);
	}
	return problems;
}

export function run(root) {
	const files = execFileSync("git", ["ls-files", "-z"], {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter(Boolean);
	const present = files.filter((f) => fs.existsSync(path.join(root, f)));
	const problems = [
		...checkPaths(files),
		...checkSizes(
			present.map((f) => ({
				path: f,
				size: fs.statSync(path.join(root, f)).size,
			})),
		),
	];
	for (const f of present) {
		problems.push(
			...checkContent(f, fs.readFileSync(path.join(root, f), "utf8")),
		);
	}
	return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
	const problems = run(root);
	if (problems.length > 0) {
		console.error("check-repo-hygiene: FAILED (the repo is public)");
		for (const p of problems) console.error(`  ${p}`);
		console.error(
			"See CONTRIBUTING.md 'What never goes in git'. A real secret: rotate it first.",
		);
		process.exit(1);
	}
	console.log("check-repo-hygiene: OK");
}
