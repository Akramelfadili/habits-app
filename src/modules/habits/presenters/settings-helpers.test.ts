import {
	kilobytesLabel,
	notificationImpact,
	versionLabel,
} from "./settings-helpers";

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

describe("kilobytesLabel", () => {
	it("rounds up to whole kilobytes, at least 1, with thousands grouped", () => {
		expect(kilobytesLabel(1)).toBe("1 KB");
		expect(kilobytesLabel(49152)).toBe("48 KB");
		expect(kilobytesLabel(1048576 * 2)).toBe("2,048 KB");
	});
});

describe("versionLabel", () => {
	it("joins version and build", () => {
		expect(versionLabel({ version: "3.0", build: "412" })).toBe(
			"3.0 (build 412)",
		);
	});
});
