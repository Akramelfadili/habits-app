#!/usr/bin/env node
// node capture.mjs --shard light|dark|ax-light|ax-dark --bundle-id <id> [--ax-size <size>] [--only "a b"] --out out
// Files are named like the web baselines (`<state>.png`).
import fs from "node:fs";
import path from "node:path";
import { buildPlan } from "./plan.mjs";
import { parseArgs, run, simctl, sleep } from "./sh.mjs";

const args = parseArgs(process.argv.slice(2));
const shard = String(args.shard);
const bundleId = String(args["bundle-id"]);
const out = String(args.out ?? "out");
const axSize = String(
	args["ax-size"] ?? "accessibility-extra-extra-extra-large",
);
const only = String(args.only === true ? "" : (args.only ?? ""))
	.split(/\s+/)
	.filter(Boolean);
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 4500);
// A PNG smaller than this is the splash or a blank frame at 3x; it is retaken once.
const BLANK_BYTES = 20_000;

const shotsDir = path.join(out, "shots");
const flowsDir = path.join(out, "maestro");
fs.mkdirSync(shotsDir, { recursive: true });
fs.mkdirSync(flowsDir, { recursive: true });
const logFile = path.join(out, "log.txt");
const log = (message) => {
	console.log(message);
	fs.appendFileSync(logFile, `${message}\n`);
};

const plan = (await buildPlan()).filter(
	(item) =>
		item.shard === shard && (only.length === 0 || only.includes(item.name)),
);
log(`shard ${shard}: ${plan.length} states`);

simctl([
	"ui",
	"booted",
	"appearance",
	shard.endsWith("dark") ? "dark" : "light",
]);
simctl([
	"ui",
	"booted",
	"content_size",
	shard.startsWith("ax-") ? axSize : "large",
]);
log(
	`appearance ${shard.endsWith("dark") ? "dark" : "light"}, content size ${shard.startsWith("ax-") ? axSize : "large"}`,
);

const booted = JSON.parse(simctl(["list", "devices", "booted", "-j"]).stdout);
const udid = Object.values(booted.devices).flat()[0]?.udid;
const container = simctl([
	"get_app_container",
	"booted",
	bundleId,
	"data",
]).stdout.trim();
const documents = path.join(container, "Documents");
fs.mkdirSync(documents, { recursive: true });

function open(item, settle) {
	fs.writeFileSync(
		path.join(documents, "dev-state.json"),
		JSON.stringify({ route: item.route, clock: item.clock }),
	);
	simctl(["terminate", "booted", bundleId], { allowFail: true });
	simctl(["launch", "booted", bundleId]);
	return sleep(settle);
}

function flowFile(item) {
	const file = path.join(flowsDir, `${item.name}.yaml`);
	const body = item.steps.map((step) => `- ${JSON.stringify(step)}`).join("\n");
	fs.writeFileSync(file, `appId: ${bundleId}\n---\n${body}\n`);
	return file;
}

function shoot(file) {
	simctl(["io", "booted", "screenshot", "--type=png", file]);
	return fs.statSync(file).size;
}

const results = [];
let first = true;
for (const item of plan) {
	const started = Date.now();
	const result = {
		name: item.name,
		shard,
		status: "captured",
		notes: [...item.caveats],
	};
	if (item.status === "unsupported") {
		results.push({ ...result, status: "unsupported", reason: item.reason });
		continue;
	}
	const file = path.join(shotsDir, `${item.name}.png`);
	try {
		await open(item, first ? SETTLE_MS + 6000 : SETTLE_MS);
		first = false;
		if (item.status === "flow") {
			const flow = run(
				"maestro",
				[
					"--udid",
					udid,
					"test",
					flowFile(item),
					"--debug-output",
					path.join(flowsDir, item.name),
				],
				{ allowFail: true, timeout: 240_000 },
			);
			if (!flow.ok) {
				result.notes.push(
					`Maestro failed at: ${(flow.stdout + flow.stderr)
						.split("\n")
						.filter((line) => /\.\.\. (FAILED|WARNED)/.test(line))
						.slice(-3)
						.join(" | ")
						.slice(0, 400)}`,
				);
				result.status = "partial";
			}
			await sleep(700);
		}
		let bytes = shoot(file);
		if (bytes < BLANK_BYTES) {
			result.notes.push(
				`first frame was ${bytes} bytes (blank or splash); retaken`,
			);
			await sleep(5000);
			bytes = shoot(file);
			if (bytes < BLANK_BYTES) result.status = "blank";
		}
		result.bytes = bytes;
	} catch (error) {
		result.status = "failed";
		result.notes.push(String(error.message).slice(0, 400));
	}
	result.ms = Date.now() - started;
	results.push(result);
	log(`${result.status.padEnd(9)} ${item.name} (${result.ms} ms)`);
}

fs.writeFileSync(
	path.join(out, "results.json"),
	JSON.stringify(results, null, 2),
);
const count = (status) => results.filter((r) => r.status === status).length;
const summary = [
	`### Capture ${shard}`,
	`- ${count("captured")} captured · ${count("partial")} with a failed step · ${count("blank")} blank · ${count("failed")} failed · ${count("unsupported")} not reproducible`,
	...results
		.filter(
			(r) =>
				r.status === "failed" || r.status === "blank" || r.status === "partial",
		)
		.map((r) => `  - \`${r.name}\` (${r.status}): ${r.notes.at(-1) ?? ""}`),
].join("\n");
fs.writeFileSync(path.join(out, "summary.md"), summary);
console.log(summary);
