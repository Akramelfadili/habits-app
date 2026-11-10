import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	checkFile,
	extractRefs,
	hasHeading,
	normalizeRef,
	sectionAfter,
} from "./check-doc-refs.mjs";

const TRACKED = [
	"CLAUDE.md",
	"CONTRIBUTING.md",
	"docs/README.md",
	"docs/backlog.md",
	"src/components/ui/composite/header-buttons.tsx",
	"src/modules/habits/screens/today-screen.tsx",
];
const BODIES = {
	"docs/backlog.md": "# Backlog\n\n## Decided\n\nx\n\n## Open items\n",
	"CONTRIBUTING.md": "# Contributing\n\n## What never goes in git\n",
};
const fsApi = {
	exists: (rel) =>
		TRACKED.includes(rel) || rel === "docs" || rel === "src/components",
	read: (rel) => BODIES[rel] ?? "",
	topLevel: new Set(TRACKED.map((f) => f.split("/")[0])),
	baseNames: new Set(TRACKED.map((f) => f.split("/").pop())),
	endsWith: (ref) => TRACKED.some((f) => f.endsWith(`/${ref}`)),
};
const check = (text, file = "docs/README.md") => checkFile(file, text, fsApi);

describe("normalizeRef", () => {
	it("keeps repo-path shapes and strips anchors and line numbers", () => {
		assert.equal(normalizeRef("docs/backlog.md#decided"), "docs/backlog.md");
		assert.equal(normalizeRef("src/a/b.ts:12-30"), "src/a/b.ts");
		assert.equal(normalizeRef("src/modules/"), "src/modules");
		assert.equal(normalizeRef("types.ts"), "types.ts");
	});

	it("ignores URLs, anchors, globs, placeholders, commands and prose", () => {
		for (const s of [
			"https://docs.expo.dev/llms.txt",
			"#section",
			"docs/*.md",
			"docs/<name>.md",
			"npm run e2e",
			"~/notes.md",
			"/abs/path.md",
			"@types/node",
			"1.5/2",
			"foo",
			"--flag",
			"fix/…",
		]) {
			assert.equal(normalizeRef(s), null, s);
		}
	});
});

describe("extractRefs", () => {
	it("finds backticked paths, link targets and fenced tokens", () => {
		const text = [
			"See `docs/a.md` and [b](../b.md#x).",
			"```bash",
			"grep -n '^## HAB' docs/c.md",
			"```",
		].join("\n");
		const refs = extractRefs(text).map((r) => [r.ref, r.kind, r.line]);
		assert.deepEqual(
			refs.sort(),
			[
				["../b.md", "link", 1],
				["docs/a.md", "code", 1],
				["docs/c.md", "fence", 3],
			].sort(),
		);
	});
});

describe("sections", () => {
	it("reads the quoted heading after § or →", () => {
		assert.equal(sectionAfter('`x.md` § "Decided" more', 6), "Decided");
		assert.equal(sectionAfter('`x.md` → "Wasn\'t"', 6), "Wasn't");
		assert.equal(sectionAfter("`x.md` and more", 6), null);
	});

	it("matches a heading by its leading words", () => {
		assert.equal(hasHeading("## Decided (final)\n", "decided"), true);
		assert.equal(hasHeading("text Decided\n", "Decided"), false);
	});
});

describe("checkFile", () => {
	it("passes real paths, from the file's folder or the root", () => {
		assert.deepEqual(
			check("`docs/backlog.md`, `backlog.md`, [x](backlog.md), `CLAUDE.md`"),
			[],
		);
	});

	it("fails a missing path with file and line", () => {
		const out = check("ok\n\nSee `docs/gone.md` here.\n");
		assert.deepEqual(out, ['docs/README.md:3: missing path "docs/gone.md"']);
	});

	it("fails a missing link target, resolved from the file's folder", () => {
		assert.equal(check("[x](CLAUDE.md)").length, 1);
		assert.deepEqual(check("[x](../CLAUDE.md)"), []);
	});

	it("fails a missing bare file name", () => {
		assert.equal(check("`gone.ts`").length, 1);
		assert.deepEqual(check("`today-screen.tsx`"), []);
	});

	it("accepts a module-relative path in docs but not in CLAUDE.md", () => {
		assert.deepEqual(check("`screens/today-screen.tsx`"), []);
		assert.equal(check("`screens/today-screen.tsx`", "CLAUDE.md").length, 1);
		assert.equal(
			check("`composite/header-buttons.tsx`", "CLAUDE.md").length,
			1,
		);
		assert.deepEqual(
			check("`src/components/ui/composite/header-buttons.tsx`", "CLAUDE.md"),
			[],
		);
	});

	it("skips prose with slashes, placeholders and the allowlist", () => {
		assert.deepEqual(
			check("`week/day` `V1/V2` `docs/<id>.md` `docs/*.md` `x.web.ts`"),
			[],
		);
	});

	it("checks § section references against the target's headings", () => {
		assert.deepEqual(check('`docs/backlog.md` § "Decided"'), []);
		assert.deepEqual(check('`CONTRIBUTING.md` → "What never goes in git"'), []);
		assert.equal(check('`docs/backlog.md` § "Nope"').length, 1);
	});
});
