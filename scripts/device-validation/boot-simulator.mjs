#!/usr/bin/env node
// node boot-simulator.mjs --device "iPhone 16" --app dist/app.zip --bundle-id <id> --summary "$GITHUB_STEP_SUMMARY"
// The fallback model is the newest iPhone that is no SE, Pro Max or Air: iPhone 16's 393x852 pt matches the web baselines' viewport.
import fs from "node:fs";
import path from "node:path";
import { appendSummary, parseArgs, run, simctl } from "./sh.mjs";

const args = parseArgs(process.argv.slice(2));

const versionParts = (version) => version.split(".").map(Number);
const compare = (a, b) => {
	const [x, y] = [versionParts(a), versionParts(b)];
	for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
		const d = (x[i] ?? 0) - (y[i] ?? 0);
		if (d !== 0) return d;
	}
	return 0;
};

const { runtimes } = JSON.parse(simctl(["list", "runtimes", "-j"]).stdout);
const ios = runtimes
	.filter((r) => r.isAvailable && /^iOS/i.test(r.platform ?? r.name))
	.sort((a, b) => compare(b.version, a.version));
if (ios.length === 0) {
	console.error("No available iOS simulator runtime on this runner.");
	process.exit(1);
}
const runtime = ios[0];

const supported = runtime.supportedDeviceTypes.filter((t) =>
	/iPhone/.test(t.name),
);
const wanted = String(args.device ?? "iPhone 16");
let deviceType = supported.find((t) => t.name === wanted);
if (!deviceType) {
	deviceType = supported
		.filter((t) => !/SE|Pro Max|Air|Plus|mini/.test(t.name))
		.sort((a, b) =>
			b.name.localeCompare(a.name, undefined, { numeric: true }),
		)[0];
	console.warn(
		`"${wanted}" is not on ${runtime.name}; using ${deviceType?.name}.`,
	);
}
if (!deviceType) {
	console.error(`${runtime.name} offers no iPhone model.`);
	process.exit(1);
}

const udid = simctl([
	"create",
	"validation",
	deviceType.identifier,
	runtime.identifier,
]).stdout.trim();
run(
	"defaults",
	[
		"write",
		"com.apple.iphonesimulator",
		"ConnectHardwareKeyboard",
		"-bool",
		"false",
	],
	{ allowFail: true },
);
simctl(["boot", udid]);
simctl(["bootstatus", udid, "-b"], { timeout: 600_000 });

const work = fs.mkdtempSync(
	path.join(process.env.RUNNER_TEMP ?? "/tmp", "app-"),
);
run("ditto", ["-x", "-k", String(args.app), work]);
const appDir = fs.readdirSync(work).find((name) => name.endsWith(".app"));
simctl(["install", udid, path.join(work, appDir)]);
simctl(
	[
		"status_bar",
		udid,
		"override",
		"--time",
		"9:41",
		"--batteryState",
		"charged",
		"--batteryLevel",
		"100",
		"--wifiBars",
		"3",
		"--cellularBars",
		"4",
	],
	{ allowFail: true },
);

const image = process.env.ImageOS
	? `${process.env.ImageOS} ${process.env.ImageVersion}`
	: "local";
const lines = [
	"### Simulator",
	`- Model: **${deviceType.name}** (${udid})`,
	`- Runtime: **${runtime.name}** (build ${runtime.buildversion ?? "?"})`,
	`- Runner image: \`${image}\``,
	`- App: \`${appDir}\` (${args["bundle-id"]})`,
];
console.log(lines.join("\n"));
appendSummary(args.summary, lines.join("\n"));
