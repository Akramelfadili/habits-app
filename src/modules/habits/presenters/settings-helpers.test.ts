import {
	exportButtonLabel,
	exportFailureMessage,
	notificationImpact,
	rangeLabel,
} from "./settings-helpers";

const today = new Date(2026, 8, 16, 12);

describe("notificationImpact (SY6)", () => {
	const habits = [
		{ id: 1, archivedAt: null },
		{ id: 2, archivedAt: null },
		{ id: 3, archivedAt: new Date(2026, 8, 1) },
	];

	it("counts the enabled times and the distinct active habits they sit on", () => {
		expect(
			notificationImpact(
				[
					{ habitId: 1, enabled: true },
					{ habitId: 1, enabled: true },
					{ habitId: 2, enabled: true },
				],
				habits,
			),
		).toEqual({ times: 3, habits: 2 });
	});

	it("leaves out times that are off and times on archived habits", () => {
		expect(
			notificationImpact(
				[
					{ habitId: 1, enabled: false },
					{ habitId: 3, enabled: true },
				],
				habits,
			),
		).toEqual({ times: 0, habits: 0 });
	});
});

describe("export labels", () => {
	it("pluralises and groups thousands", () => {
		expect(exportButtonLabel(1284)).toBe("Export 1,284 entries");
		expect(exportButtonLabel(1)).toBe("Export 1 entry");
	});

	it("shows a range, one date, or a placeholder", () => {
		expect(rangeLabel({ from: "2026-03-03", to: "2026-09-16" })).toBe(
			"3 Mar – 16 Sep 2026",
		);
		expect(rangeLabel({ from: "2025-11-03", to: "2026-09-16" })).toBe(
			"3 Nov 2025 – 16 Sep 2026",
		);
		expect(rangeLabel({ from: "2026-09-16", to: "2026-09-16" })).toBe(
			"16 Sep 2026",
		);
		expect(rangeLabel(null)).toBe("No entries yet");
	});

	it("explains a storage failure with the size needed", () => {
		expect(exportFailureMessage({ kind: "storage", neededBytes: 219136 })).toBe(
			"This iPhone is out of storage. The file needs about 214 KB free.",
		);
		expect(exportFailureMessage({ kind: "unknown" })).toMatch(/Try again/);
	});
});
