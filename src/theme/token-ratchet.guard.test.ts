/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";

/**
 * Design-token ratchet. The design system says colours, shadows, type sizes and
 * weights come from `src/theme` tokens; today some escapes remain (audit A4).
 * The committed baseline is the number of escapes that exist now — it may only
 * go DOWN:
 *   - a count goes UP   → you added an escape: use a token instead.
 *   - a count goes DOWN → good! run `npm run ratchet:update` to lock it in.
 * Counting lives in scripts/lib/token-counts.cjs (shared with that script).
 */
const { countTokens, PATTERNS } =
	require("../../scripts/lib/token-counts.cjs") as {
		countTokens: (srcDir: string) => {
			counts: Record<string, number>;
			hits: Record<string, string[]>;
		};
		PATTERNS: Record<string, { test: (line: string) => boolean }>;
	};

const SRC = path.join(__dirname, "..");
const baseline: Record<string, number> = JSON.parse(
	fs.readFileSync(path.join(__dirname, "token-ratchet.baseline.json"), "utf8"),
);

describe("design-token ratchet", () => {
	const { counts, hits } = countTokens(SRC);

	it("counts what it is meant to count", () => {
		expect(PATTERNS["colour-literals"].test(`color: "#ff0000"`)).toBe(true);
		expect(PATTERNS["colour-literals"].test(`color: "rgba(0,0,0,.2)"`)).toBe(
			true,
		);
		expect(PATTERNS["colour-literals"].test(`color: 'white'`)).toBe(true);
		expect(PATTERNS["colour-literals"].test(`color: colors.ink`)).toBe(false);
		expect(PATTERNS["shadow-elevation"].test(`shadowColor: "x",`)).toBe(true);
		expect(PATTERNS["shadow-elevation"].test(`elevation: 8,`)).toBe(true);
		expect(PATTERNS["font-size-literals"].test(`fontSize: 13,`)).toBe(true);
		expect(PATTERNS["font-size-literals"].test(`...type.body,`)).toBe(false);
		expect(PATTERNS["line-height-literals"].test(`lineHeight: 18,`)).toBe(true);
		expect(PATTERNS["font-weight-not-500-600"].test(`fontWeight: "700",`)).toBe(
			true,
		);
		expect(
			PATTERNS["font-weight-not-500-600"].test(`fontWeight: "bold",`),
		).toBe(true);
		expect(PATTERNS["font-weight-not-500-600"].test(`fontWeight: "500",`)).toBe(
			false,
		);
		expect(PATTERNS["font-weight-not-500-600"].test(`fontWeight: "600",`)).toBe(
			false,
		);
		for (const line of [
			"padding: 16,",
			"paddingHorizontal: 14,",
			"marginTop: -4,",
			"gap: 8,",
			"columnGap: 0.5,",
		]) {
			expect(PATTERNS["spacing-literals"].test(line)).toBe(true);
		}
		for (const line of ["padding: 0,", "gap: space[200],", "margin: 0 },"]) {
			expect(PATTERNS["spacing-literals"].test(line)).toBe(false);
		}
		expect(PATTERNS["radius-literals"].test("borderRadius: 20,")).toBe(true);
		expect(PATTERNS["radius-literals"].test("borderTopLeftRadius: 28,")).toBe(
			true,
		);
		expect(PATTERNS["radius-literals"].test("borderRadius: 0,")).toBe(false);
		expect(PATTERNS["radius-literals"].test("borderRadius: radius.l,")).toBe(
			false,
		);
		for (const line of [
			"fontSize: 11,",
			"fontSize: 12.5,",
			"fontSize: 10 }",
			"fontSize: typeScale.caption,",
			"fontSize: typeScale.micro,",
			"fontSize: typeScale.subtitle,",
		]) {
			expect(PATTERNS["off-scale-font-sizes"].test(line)).toBe(true);
		}
		for (const line of [
			"fontSize: 12,",
			"fontSize: 110,",
			"fontSize: typeScale.rowLabel,",
			"...textStyles.caption,",
		]) {
			expect(PATTERNS["off-scale-font-sizes"].test(line)).toBe(false);
		}
	});

	it("scans the production source tree", () => {
		expect(Object.keys(counts).sort()).toEqual(Object.keys(baseline).sort());
		expect(counts["font-size-literals"]).toBeGreaterThan(0);
	});

	for (const key of Object.keys(baseline)) {
		it(`${key} has not gone up`, () => {
			const sites = hits[key].join("\n  ");
			expect(
				counts[key] <= baseline[key]
					? ""
					: `${key} rose from ${baseline[key]} to ${counts[key]} — use a theme token. Current sites:\n  ${sites}`,
			).toBe("");
		});

		it(`${key} baseline is not stale`, () => {
			expect(
				counts[key] >= baseline[key]
					? ""
					: `${key} dropped from ${baseline[key]} to ${counts[key]} — lower the baseline: run \`npm run ratchet:update\``,
			).toBe("");
		});
	}
});
