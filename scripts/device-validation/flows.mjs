import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const FRIDAY = "2026-10-23T09:00:00";

/** The known-bug flows in scripts/device-validation/flows. */
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

/**
 * A web journey as an iOS flow: the launch URL's route and clock, and the body
 * with `launchApp` dropped and `id:` selectors read as text (on iOS an
 * accessibility label is matched as text).
 */
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
	const flow = `appId: \${BUNDLE_ID}\n---\n${body}`;
	return { route: `${route}${params.size ? `?${params}` : ""}`, clock, flow };
}

/** Reads Maestro's `commands-*.json` into [{ kind, status, ms }]. */
export function readCommands(debugDir) {
	if (!fs.existsSync(debugDir)) return [];
	const file = fs
		.readdirSync(debugDir)
		.find((name) => /^commands.*\.json$/.test(name));
	if (!file) return [];
	try {
		const parsed = JSON.parse(
			fs.readFileSync(path.join(debugDir, file), "utf8"),
		);
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
