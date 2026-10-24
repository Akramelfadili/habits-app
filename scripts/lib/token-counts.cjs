// Counts design-token escapes in production source: raw colours, shadows,
// font sizes/line heights and non-token font weights outside src/theme.
// Shared by the Jest guard (src/theme/token-ratchet.guard.test.ts) and
// `npm run ratchet:update`, so both always count the same way.
const fs = require("node:fs");
const path = require("node:path");

const PATTERNS = {
	"colour-literals":
		/["'`]#[0-9a-fA-F]{3,8}["'`]|\brgba?\(|\boklch\(|["'](?:white|black)["']/,
	"shadow-elevation": /\b(?:shadow[A-Z]\w*|elevation)\s*:/,
	"font-size-literals": /\bfontSize:\s*\d/,
	"line-height-literals": /\blineHeight:\s*\d/,
	// Anything but the two weights the design system uses (500 / 600).
	"font-weight-not-500-600": {
		test(line) {
			const match = /\bfontWeight:\s*([^,}\s]+)/.exec(line);
			return !!match && !/^["']?(?:500|600)["']?$/.test(match[1]);
		},
	},
};

const SKIP_DIRS = new Set(["node_modules", "migrations", "test-support"]);
const SKIP_FILES =
	/\.test\.tsx?$|\.d\.ts$|-fixtures\.ts$|[\\/]test-db\.ts$|[\\/]test-live-query\.ts$/;

function walk(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory())
			return SKIP_DIRS.has(entry.name) ||
				full.endsWith(path.join("src", "theme"))
				? []
				: walk(full);
		return /\.tsx?$/.test(entry.name) && !SKIP_FILES.test(full) ? [full] : [];
	});
}

function stripComments(text) {
	return text
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
		.replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** @returns {{ counts: Record<string, number>, hits: Record<string, string[]> }} */
function countTokens(srcDir) {
	const counts = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0]));
	const hits = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, []]));
	for (const file of walk(srcDir)) {
		const lines = stripComments(fs.readFileSync(file, "utf8")).split("\n");
		lines.forEach((line, index) => {
			for (const [key, re] of Object.entries(PATTERNS)) {
				if (!re.test(line)) continue;
				counts[key] += 1;
				hits[key].push(
					`${path.relative(srcDir, file).split(path.sep).join("/")}:${index + 1}: ${line.trim()}`,
				);
			}
		});
	}
	return { counts, hits };
}

module.exports = { countTokens, PATTERNS };
