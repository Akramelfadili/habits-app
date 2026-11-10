#!/usr/bin/env node
// npm run e2e [-- e2e/<journey>.yaml ...]
// Reuses a dev server at APP_URL (default http://localhost:8081) or starts one. Output lands in .e2e-output/.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	BASE_URL,
	ensureServer,
	libraryPath,
	ROOT,
	stopServer,
	warmBundle,
} from "./lib/dev-server.mjs";

const OUT_DIR = path.join(ROOT, ".e2e-output");

// Maestro's web driver scrolls the window, not React Native Web's inner ScrollViews, so a tall viewport keeps every tapped row on screen.
const SCREEN_SIZE = "393x1600";

// Maestro installs to ~/.maestro/bin and needs a JDK 17+ (JAVA_HOME or ~/.local/opt/jdk-*).
function maestroEnv() {
	const env = {
		...process.env,
		LD_LIBRARY_PATH: libraryPath(),
		MAESTRO_CLI_NO_ANALYTICS: "1",
		MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
	};
	const optDir = path.join(os.homedir(), ".local/opt");
	if (!env.JAVA_HOME && fs.existsSync(optDir)) {
		const jdk = fs.readdirSync(optDir).find((name) => name.startsWith("jdk-"));
		if (jdk) env.JAVA_HOME = path.join(optDir, jdk);
	}
	env.PATH = [
		path.join(os.homedir(), ".maestro/bin"),
		env.JAVA_HOME && path.join(env.JAVA_HOME, "bin"),
		env.PATH,
	]
		.filter(Boolean)
		.join(":");
	return env;
}

async function main() {
	const flows = process.argv.slice(2);
	const env = maestroEnv();
	if (spawnSync("maestro", ["--version"], { env }).status !== 0) {
		console.error(
			"Maestro not found — install it (see e2e/README.md) or put it on PATH.",
		);
		process.exit(1);
	}

	fs.rmSync(OUT_DIR, { recursive: true, force: true });
	const server = await ensureServer();
	let status = 1;
	try {
		await warmBundle();
		const result = spawnSync(
			"maestro",
			[
				"test",
				"--headless",
				"--screen-size",
				SCREEN_SIZE,
				"--test-output-dir",
				OUT_DIR,
				"--format",
				"junit",
				"--output",
				path.join(OUT_DIR, "report.xml"),
				"-e",
				`APP_URL=${BASE_URL}`,
				...(flows.length > 0 ? flows : ["e2e/"]),
			],
			{ cwd: ROOT, env, stdio: "inherit" },
		);
		status = result.status ?? 1;
	} finally {
		stopServer(server);
	}
	process.exitCode = status;
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
