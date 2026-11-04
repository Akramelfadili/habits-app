import { spawnSync } from "node:child_process";
import fs from "node:fs";

/** Runs a command, returns { ok, stdout, stderr }; throws on failure unless `allowFail`. */
export function run(command, args, { allowFail = false, input, timeout } = {}) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		input,
		timeout,
		maxBuffer: 256 * 1024 * 1024,
	});
	const ok = result.status === 0;
	if (!ok && !allowFail) {
		throw new Error(
			`${command} ${args.join(" ")} failed (${result.status ?? result.signal}): ${(result.stderr || result.stdout || "").trim().slice(0, 600)}`,
		);
	}
	return { ok, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export const simctl = (args, options) =>
	run("xcrun", ["simctl", ...args], options);

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** `--name value` pairs and bare `--flag`s. */
export function parseArgs(argv) {
	const args = {};
	for (let i = 0; i < argv.length; i += 1) {
		if (!argv[i].startsWith("--")) continue;
		const key = argv[i].slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith("--")) args[key] = true;
		else {
			args[key] = next;
			i += 1;
		}
	}
	return args;
}

export function appendSummary(file, text) {
	if (file && typeof file === "string") fs.appendFileSync(file, `${text}\n`);
}
