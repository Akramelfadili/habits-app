#!/usr/bin/env node
/**
 * Behaviour flows on the simulator, each recorded on video.
 *
 *   node record-flows.mjs --bundle-id <id> --out out [--only "day-strip toast"]
 *
 * Two groups: the known-bug flows in scripts/device-validation/flows (a–f of the device-validation
 * brief), and the six web journeys in e2e/*.yaml converted on the fly (the
 * `url:` header becomes a launch request, `id:` selectors become `text:`).
 * Every flow runs from a freshly opened state: the driver writes
 * `Documents/dev-state.json`, relaunches the app, starts
 * `simctl io booted recordVideo`, runs Maestro, stops the recording.
 *
 * Output per flow: <id>.mp4, <id>/ (Maestro's screenshots and command log),
 * and a row in results.json / summary.md. Maestro records each command's
 * duration; the toast flow's `notVisible` wait is the time the toast stayed.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
	BUG_FLOWS,
	convertWebFlow,
	ROOT,
	readCommands,
	readLogCommands,
} from "./flows.mjs";
import { parseArgs, run, simctl, sleep } from "./sh.mjs";

const args = parseArgs(process.argv.slice(2));
const bundleId = String(args["bundle-id"]);
const out = String(args.out ?? "out");
const only = String(args.only === true ? "" : (args.only ?? ""))
	.split(/\s+/)
	.filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const udid = Object.values(
	JSON.parse(simctl(["list", "devices", "booted", "-j"]).stdout).devices,
).flat()[0]?.udid;
const container = simctl([
	"get_app_container",
	"booted",
	bundleId,
	"data",
]).stdout.trim();
const documents = path.join(container, "Documents");
fs.mkdirSync(documents, { recursive: true });
simctl(["ui", "booted", "appearance", "light"]);
simctl(["ui", "booted", "content_size", "large"]);

async function runFlow(flow) {
	const dir = path.join(out, flow.id);
	fs.mkdirSync(dir, { recursive: true });
	const flowFile = path.join(dir, "flow.yaml");
	fs.writeFileSync(flowFile, flow.yaml);

	fs.writeFileSync(
		path.join(documents, "dev-state.json"),
		JSON.stringify({ route: flow.route, clock: flow.clock }),
	);
	simctl(["terminate", "booted", bundleId], { allowFail: true });
	simctl(["launch", "booted", bundleId]);
	await sleep(6000);

	const video = path.join(out, `${flow.id}.mp4`);
	const recorder = spawn(
		"xcrun",
		["simctl", "io", "booted", "recordVideo", "--codec=h264", "--force", video],
		{ stdio: "ignore" },
	);
	await sleep(1500);
	const started = Date.now();
	const result = run(
		"maestro",
		[
			"--udid",
			udid,
			"test",
			flowFile,
			"-e",
			`BUNDLE_ID=${bundleId}`,
			"--debug-output",
			path.join(dir, "debug"),
			"--test-output-dir",
			dir,
		],
		{ allowFail: true, timeout: 420_000 },
	);
	const wallMs = Date.now() - started;
	await sleep(1500);
	const stopped = new Promise((resolve) => recorder.once("close", resolve));
	recorder.kill("SIGINT");
	await Promise.race([stopped, sleep(20_000)]);

	fs.writeFileSync(
		path.join(dir, "maestro.log"),
		`${result.stdout}\n${result.stderr}`,
	);
	const fromJson = readCommands(path.join(dir, "debug"));
	const commands =
		fromJson.length > 0
			? fromJson
			: readLogCommands(`${result.stdout}\n${result.stderr}`);
	return {
		id: flow.id,
		bug: flow.bug ?? null,
		ok: result.ok,
		wallMs,
		video: fs.existsSync(video) ? path.basename(video) : null,
		videoBytes: fs.existsSync(video) ? fs.statSync(video).size : 0,
		warned: commands
			.filter((c) => c.status === "WARNED")
			.map((c) => `${c.kind} ${c.detail}`),
		failed: commands
			.filter((c) => c.status === "FAILED")
			.map((c) => `${c.kind} ${c.detail}`),
		waits: commands
			.filter(
				(c) => c.kind === "extendedWaitUntil" && c.ms !== null && c.ms > 1600,
			)
			.map((c) => ({ detail: c.detail, ms: c.ms })),
		tail: result.ok
			? ""
			: (result.stdout + result.stderr)
					.trim()
					.split("\n")
					.slice(-6)
					.join(" | "),
	};
}

const flows = BUG_FLOWS.map((flow) => ({
	...flow,
	yaml: fs.readFileSync(flow.source, "utf8"),
}));
for (const file of fs
	.readdirSync(path.join(ROOT, "e2e"))
	.filter((n) => n.endsWith(".yaml"))
	.sort()) {
	const id = `journey-${file.replace(/\.yaml$/, "")}`;
	const converted = convertWebFlow(
		fs.readFileSync(path.join(ROOT, "e2e", file), "utf8"),
		id,
	);
	flows.push({
		id,
		route: converted.route,
		clock: converted.clock,
		yaml: converted.flow,
	});
}

const results = [];
for (const flow of flows.filter(
	(f) => only.length === 0 || only.includes(f.id),
)) {
	console.log(`flow ${flow.id} …`);
	try {
		results.push(await runFlow(flow));
	} catch (error) {
		results.push({
			id: flow.id,
			ok: false,
			tail: String(error.message).slice(0, 300),
		});
	}
	console.log(`  ${results.at(-1).ok ? "passed" : "FAILED"}`);
}

fs.writeFileSync(
	path.join(out, "results.json"),
	JSON.stringify(results, null, 2),
);
const rows = results.map(
	(r) =>
		`| ${r.id} | ${r.ok ? "passed" : "**failed**"} | ${r.wallMs ? `${(r.wallMs / 1000).toFixed(1)} s` : "–"} | ${r.warned?.length ?? 0} warned, ${r.failed?.length ?? 0} failed | ${(r.waits ?? []).map((w) => `${(w.ms / 1000).toFixed(1)} s`).join(", ") || "–"} |`,
);
const totalVideo = results.reduce((sum, r) => sum + (r.videoBytes ?? 0), 0);
fs.writeFileSync(
	path.join(out, "summary.md"),
	[
		"### Behaviour flows",
		"| Flow | Result | Wall time | Optional steps | Long waits (toast time to hide = the `notVisible` wait) |",
		"|---|---|---|---|---|",
		...rows,
		"",
		`Videos: ${(totalVideo / 1e6).toFixed(1)} MB.`,
	].join("\n"),
);
console.log(fs.readFileSync(path.join(out, "summary.md"), "utf8"));
