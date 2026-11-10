// Tests for scripts/check-comment-refs.mjs, on synthetic sources. The ticket
// ids and version words are assembled at runtime so this file stays clean.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkAgainstAllowlist, findHits } from "./check-comment-refs.mjs";

const ticket = `${"HAB"}-12`;
const version = `${"V"}3`;

describe("findHits", () => {
	it("finds a ticket id in a line comment, a block comment and a JSDoc", () => {
		const text = `// fixes ${ticket}\n/* see ${ticket} */\n/** ${ticket} */\nconst a = 1;\n`;
		assert.deepEqual(
			findHits("a.ts", text).map((h) => h.line),
			[1, 2, 3],
		);
	});

	it("finds a spec-version word but not a lowercase path or a longer word", () => {
		const text = `// the ${version} spec\n// docs/mockups/${version.toLowerCase()}/renders\n// ${version}x and x${version}\n`;
		assert.deepEqual(
			findHits("a.ts", text).map((h) => h.line),
			[1],
		);
	});

	it("finds a ticket id in a test title, including it.each and describe.skip", () => {
		const text = `describe("a (${ticket})", () => {\n  it.each([1])("b ${version}", () => {});\n  describe.skip("c ${ticket}", () => {});\n});\n`;
		const hits = findHits("a.test.ts", text);
		assert.deepEqual(
			hits.map((h) => h.what),
			["test title", "test title", "test title"],
		);
	});

	it("ignores a string that is not a test title and code outside comments", () => {
		const text = `const label = "${ticket}";\nconst re = /${version}/;\nfoo("${ticket}");\n`;
		assert.deepEqual(findHits("a.ts", text), []);
	});

	it("finds a comment inside JSX", () => {
		const text = `const a = <View>{/* ${ticket} */}</View>;\n`;
		assert.equal(findHits("a.tsx", text).length, 1);
	});
});

describe("checkAgainstAllowlist", () => {
	const hit = (file, line) => ({ file, line, what: "comment", text: "x" });

	it("passes with no hits and an empty allowlist", () => {
		assert.deepEqual(checkAgainstAllowlist([], {}), []);
	});

	it("fails a hit that is not allowlisted, naming file and line", () => {
		const problems = checkAgainstAllowlist([hit("src/a.ts", 4)], {});
		assert.equal(problems.length, 1);
		assert.match(problems[0], /^src\/a\.ts:4:/);
	});

	it("passes hits up to the allowlisted count", () => {
		assert.deepEqual(
			checkAgainstAllowlist([hit("src/a.ts", 1)], { "src/a.ts": 1 }),
			[],
		);
	});

	it("fails more hits than allowlisted", () => {
		const hits = [hit("src/a.ts", 1), hit("src/a.ts", 2)];
		assert.equal(checkAgainstAllowlist(hits, { "src/a.ts": 1 }).length, 2);
	});

	it("fails a stale or too-high entry so the list can only shrink", () => {
		const problems = checkAgainstAllowlist([hit("src/a.ts", 1)], {
			"src/a.ts": 2,
			"src/gone.ts": 1,
		});
		assert.equal(problems.length, 2);
		assert.match(problems[0], /lower or remove/);
	});
});
