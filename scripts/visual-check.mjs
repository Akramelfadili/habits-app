#!/usr/bin/env node
/**
 * Screenshots app screens on the web target so UI can be compared against
 * docs/mockups/ without a phone. Web swaps repositories for in-memory fixtures
 * (see `*.web.ts` in modules' repositories/), so screens render realistic data.
 *
 *   node scripts/visual-check.mjs                 # all screens
 *   node scripts/visual-check.mjs new-habit       # one (or several) screens
 *   node scripts/visual-check.mjs --list          # show screen names + mockups
 *
 * Reuses a dev server already running at VISUAL_CHECK_URL (default
 * http://localhost:8081); otherwise starts `npx expo start --web` and stops it
 * afterwards. Screenshots land in .visual-checks/<screen>.png (gitignored).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, ".visual-checks");
const BASE_URL = process.env.VISUAL_CHECK_URL ?? "http://localhost:8081";

/** Screen name → route (with fixture query) and the mockup it's checked against. */
const SCREENS = {
	today: {
		route: "/habits",
		mockup: "docs/mockups/today-populated.png",
	},
	"today-empty": {
		route: "/habits?fixtures=empty",
		mockup: "docs/mockups/today-empty-state.png",
	},
	"first-run": {
		route: "/habits?fixtures=first-run",
		mockup: "docs/mockups/first-run.png",
	},
	"today-rest-day": {
		route: "/habits?fixtures=rest-day",
		mockup: "docs/mockups/rest-day.png",
	},
	"today-day-closed": {
		route: "/habits?fixtures=day-closed",
		mockup: "docs/mockups/day-closed.png",
	},
	"new-habit": {
		route: "/new-habit",
		mockup: "docs/mockups/new-habit-form.png",
	},
	"edit-habit": {
		route: "/edit-habit/1",
		mockup: "docs/mockups/new-habit-form.png",
		note: "Mockup shows create mode; edit mode should match except Direction is locked.",
	},
	"quantity-log": {
		route: "/habits?fixtures=quantity-log",
		mockup: "docs/mockups/quantity-log.png",
		note: "Sheet is opened by simulating the tap the mockup can't capture from a static route load.",
		async interact(page) {
			await page.getByRole("button", { name: /^Log Glass of water/ }).click();
		},
	},
};

// iPhone 15/16 logical size — the mockups are drawn on this frame.
const VIEWPORT = { width: 393, height: 852 };

// Chromium's system deps unpacked without root (no sudo in WSL here) — see
// the visual-check notes in .claude/skills/implement-feature/SKILL.md.
const EXTRA_LIBS = path.join(
	os.homedir(),
	".cache/ms-playwright/extra-libs/usr/lib/x86_64-linux-gnu",
);

async function isServerUp() {
	try {
		const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
		return res.ok;
	} catch {
		return false;
	}
}

async function ensureServer() {
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

function stopServer(child) {
	if (!child) return;
	try {
		process.kill(-child.pid);
	} catch {
		// already exited
	}
}

async function capture(browser, name, screen) {
	const page = await browser.newPage({
		viewport: VIEWPORT,
		deviceScaleFactor: 2,
		colorScheme: "light",
	});
	const problems = [];
	page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
	page.on("console", (msg) => {
		if (msg.type() === "error") problems.push(`console.error: ${msg.text()}`);
	});

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

	// A screen that's only reachable by tapping into it (e.g. a bottom sheet) —
	// a static route load can't show that state, so simulate the tap first.
	if (screen.interact) {
		await screen.interact(page);
		await page.waitForTimeout(400);
	}

	const file = path.join(OUT_DIR, `${name}.png`);
	await page.screenshot({ path: file });
	await page.close();

	console.log(`\n${name}  →  ${path.relative(ROOT, file)}`);
	console.log(`  mockup: ${screen.mockup ?? "(none)"}`);
	if (screen.note) console.log(`  note:   ${screen.note}`);
	for (const problem of problems) console.log(`  ${problem}`);
	return problems.length === 0;
}

async function main() {
	const args = process.argv.slice(2);

	if (args.includes("--list")) {
		for (const [name, screen] of Object.entries(SCREENS)) {
			console.log(
				`${name.padEnd(18)} ${screen.route.padEnd(24)} ${screen.mockup ?? "-"}`,
			);
		}
		return;
	}

	const names = args.length > 0 ? args : Object.keys(SCREENS);
	const unknown = names.filter((name) => !(name in SCREENS));
	if (unknown.length > 0) {
		console.error(`Unknown screen(s): ${unknown.join(", ")}. Try --list.`);
		process.exit(1);
	}

	if (fs.existsSync(EXTRA_LIBS)) {
		process.env.LD_LIBRARY_PATH = [EXTRA_LIBS, process.env.LD_LIBRARY_PATH]
			.filter(Boolean)
			.join(":");
	}
	const { chromium } = await import("playwright");

	fs.mkdirSync(OUT_DIR, { recursive: true });
	const server = await ensureServer();
	const browser = await chromium.launch();
	let clean = true;
	try {
		for (const name of names) {
			clean = (await capture(browser, name, SCREENS[name])) && clean;
		}
	} finally {
		await browser.close();
		stopServer(server);
	}

	if (!clean) {
		console.log("\nSome screens logged errors — see above.");
		process.exitCode = 1;
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
