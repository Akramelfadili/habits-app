// `npm run ratchet:update` — rewrites src/theme/token-ratchet.baseline.json to the
// CURRENT counts. Use it after you have removed design-token escapes (the guard
// test tells you when the baseline can be lowered). It refuses to raise a count.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { countTokens } = createRequire(import.meta.url)(
	"./lib/token-counts.cjs",
);
const baselineFile = path.join(root, "src/theme/token-ratchet.baseline.json");
const { counts } = countTokens(path.join(root, "src"));
const previous = fs.existsSync(baselineFile)
	? JSON.parse(fs.readFileSync(baselineFile, "utf8"))
	: undefined;

const raised = Object.keys(counts).filter(
	(key) => previous && counts[key] > (previous[key] ?? 0),
);
if (raised.length > 0) {
	console.error(
		`Refusing to raise the baseline (${raised.map((k) => `${k}: ${previous[k]} -> ${counts[k]}`).join(", ")}). Fix the new token escapes instead.`,
	);
	process.exit(1);
}

fs.writeFileSync(baselineFile, `${JSON.stringify(counts, null, "\t")}\n`);
for (const key of Object.keys(counts))
	console.log(`${key}: ${previous?.[key] ?? "-"} -> ${counts[key]}`);
