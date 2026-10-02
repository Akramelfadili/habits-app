/**
 * Shared by scripts/visual-check.mjs and scripts/e2e.mjs: reuse an Expo web
 * dev server already running at BASE_URL, or start one and stop it after.
 */
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const BASE_URL =
	process.env.VISUAL_CHECK_URL ??
	process.env.APP_URL ??
	"http://localhost:8081";

// Chromium's system deps unpacked without root (no sudo in WSL here) — see
// the visual-check notes in .claude/skills/implement-feature/SKILL.md.
export const EXTRA_LIBS = [
	path.join(
		os.homedir(),
		".cache/ms-playwright/extra-libs/usr/lib/x86_64-linux-gnu",
	),
	path.join(
		os.homedir(),
		".cache/ms-playwright/extra-libs/lib/x86_64-linux-gnu",
	),
];

/** LD_LIBRARY_PATH with the unpacked Chromium deps prepended. */
export function libraryPath() {
	return [...EXTRA_LIBS, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
}

async function isServerUp() {
	try {
		const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
		return res.ok;
	} catch {
		return false;
	}
}

/** Returns the spawned server (to pass to `stopServer`), or null if one was already up. */
export async function ensureServer() {
	if (await isServerUp()) {
		console.log(`Using dev server already running at ${BASE_URL}`);
		return null;
	}

	const port = new URL(BASE_URL).port || "8081";
	console.log(`Starting npx expo start --web on port ${port}…`);
	const child = spawn("npx", ["expo", "start", "--web", "--port", port], {
		cwd: ROOT,
		env: { ...process.env, CI: "1", BROWSER: "none" },
		stdio: "ignore",
		detached: true,
	});

	const deadline = Date.now() + 180_000;
	while (Date.now() < deadline) {
		if (await isServerUp()) return child;
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
	stopServer(child);
	throw new Error(`Dev server didn't come up at ${BASE_URL} within 3 minutes`);
}

export function stopServer(child) {
	if (!child) return;
	try {
		process.kill(-child.pid);
	} catch {
		// already exited
	}
}

/** Warms Metro's web bundle so the first flow/screenshot doesn't time out on it. */
export async function warmBundle(route = "/habits") {
	await fetch(`${BASE_URL}${route}`, { signal: AbortSignal.timeout(180_000) });
}
