import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const FRIDAY = "2026-10-23T09:00:00";

export const BUG_FLOWS = [
	{ id: "day-strip", bug: "a", route: "/?fixtures=today-v3", clock: FRIDAY },
	{ id: "toast", bug: "b", route: "/?fixtures=today-v3", clock: FRIDAY },
	{
		id: "partial-sheet",
		bug: "c",
		route: "/?fixtures=today-v3",
		clock: FRIDAY,
	},
	{
		id: "first-run-skip",
		bug: "d",
		route: "/?fixtures=first-run",
		clock: FRIDAY,
	},
	{
		id: "log-undo-archive-restore",
		bug: "e",
		route: "/?fixtures=habits-v3",
		clock: FRIDAY,
	},
	{
		id: "sheets-today",
		bug: "f",
		route: "/?fixtures=today-v3-at-risk",
		clock: FRIDAY,
	},
	{
		id: "sheets-detail",
		bug: "f",
		route: "/(today)/habit/5?fixtures=habits-v3",
		clock: FRIDAY,
	},
	{
		id: "sheets-progress-settings",
		bug: "f",
		route: "/(progress)/progress?fixtures=progress-v3",
		clock: FRIDAY,
	},
].map((flow) => ({
	...flow,
	source: path.join(ROOT, "scripts/device-validation/flows", `${flow.id}.yaml`),
}));

// On iOS an accessibility label is matched as text, so web `id:` selectors become text.
export function convertWebFlow(text, id) {
	const [header, ...rest] = text.split(/^---\s*$/m);
	const url = /^url:\s*\$\{APP_URL\}(\S+)/m.exec(header)?.[1];
	if (!url) throw new Error(`${id}: no url: header`);
	const [route, query = ""] = url.split("?");
	const params = new URLSearchParams(query);
	const clock = params.get("clock") ?? FRIDAY;
	params.delete("clock");
	const body = rest
		.join("---")
		.split("\n")
		.filter((line) => !/^\s*-\s*launchApp\s*$/.test(line))
		.join("\n")
		.replace(/\bid:/g, "text:");
	const flow = `appId: \${BUNDLE_ID}\n---\n${iosSelectors(body)}`;
	return { route: `${route}${params.size ? `?${params}` : ""}`, clock, flow };
}

// Maestro nests `commands-*.json` in .maestro/tests/<time>/.
function findCommandsFile(dir) {
	if (!fs.existsSync(dir)) return null;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			const found = findCommandsFile(file);
			if (found) return found;
		} else if (/^commands.*\.json$/.test(entry.name)) return file;
	}
	return null;
}

const REGEX_TOKENS = /[.*+\\[\](){}|^$]/;
// Hand-fixed texts whose iOS label differs from the web's.
const TEXT_OVERRIDES = { "Thursday, 1 October": ".*Thursday,? 1 October.*" };

// iOS merges a row's texts into one label ("Meditate, Daily") and Maestro matches the whole label: asserts match any label containing the text, taps the text itself or "<text>, …".
export function iosSelectors(body) {
	let command = "";
	return body
		.split("\n")
		.map((line) => {
			const cmd = /^\s*-\s*(\w+):/.exec(line);
			if (cmd) command = cmd[1];
			return line.replace(
				/^(\s*(?:-\s*\w+:|text:|visible:|notVisible:)\s*)"([^"]*)"\s*$/,
				(whole, head, text) => {
					if (
						/^(extendedWaitUntil|scroll|swipe|inputText|launchApp|takeScreenshot)/.test(
							command,
						) &&
						!/text:|visible:|notVisible:/.test(head)
					)
						return whole;
					if (TEXT_OVERRIDES[text]) return `${head}"${TEXT_OVERRIDES[text]}"`;
					if (REGEX_TOKENS.test(text)) return whole;
					const plain = text.replaceAll("?", "\\?");
					const assertion = /assert|visible|notVisible/i.test(command);
					return `${head}"${assertion ? `.*${plain}.*` : `${plain}(,.*)?`}"`;
				},
			);
		})
		.join("\n");
}

export function readCommands(debugDir) {
	const file = findCommandsFile(debugDir);
	if (!file) return [];
	try {
		const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
		return parsed.map((entry) => {
			const kind = Object.keys(entry.command ?? {})[0] ?? "?";
			const detail = JSON.stringify(entry.command?.[kind] ?? {});
			return {
				kind,
				detail: detail.length > 140 ? `${detail.slice(0, 137)}…` : detail,
				status: entry.metadata?.status ?? "?",
				ms: entry.metadata?.duration ?? null,
			};
		});
	} catch {
		return [];
	}
}

// Fallback when the commands JSON is unreadable.
export function readLogCommands(text) {
	return [...text.matchAll(/^(.+?)\.\.\. (COMPLETED|WARNED|FAILED)\s*$/gm)].map(
		(m) => ({
			kind: "log",
			detail: m[1].slice(0, 140),
			status: m[2],
			ms: null,
		}),
	);
}
