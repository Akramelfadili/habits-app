import {
	appearanceCaption,
	exportButtonLabel,
	exportFailureMessage,
	exportRowSubtitle,
	lastExportLabel,
	rangeLabel,
	settingsMenuSubline,
} from "./settings-helpers";

const today = new Date(2026, 8, 16, 12);

describe("lastExportLabel", () => {
	it("says Never before the first export, Today on the same day", () => {
		expect(lastExportLabel(null, today)).toBe("Never");
		expect(lastExportLabel("2026-09-16", today)).toBe("Today");
	});

	it("drops the year within this one and keeps it otherwise", () => {
		expect(lastExportLabel("2026-08-02", today)).toBe("2 August");
		expect(lastExportLabel("2025-12-30", today)).toBe("30 December 2025");
	});
});

describe("settingsMenuSubline", () => {
	it("is static until an export has happened", () => {
		expect(settingsMenuSubline(null, today)).toBe(
			"Appearance, evening review, export",
		);
		expect(settingsMenuSubline("2026-08-02", today)).toBe(
			"Last export: 2 August",
		);
	});
});

describe("appearanceCaption", () => {
	it("reports what System currently resolves to", () => {
		expect(appearanceCaption("system", "dark")).toBe(
			"Matches your iPhone — currently dark. Switches whenever iOS does.",
		);
		expect(appearanceCaption("system", "light")).toContain("currently light");
	});

	it("states the fixed choice otherwise", () => {
		expect(appearanceCaption("dark", "light")).toBe(
			"Always dark, whatever your iPhone is set to.",
		);
	});
});

describe("export labels", () => {
	it("pluralises and groups thousands", () => {
		expect(exportButtonLabel(1284)).toBe("Export 1,284 entries");
		expect(exportButtonLabel(1)).toBe("Export 1 entry");
		expect(exportRowSubtitle(9, 1284)).toBe(
			"One file · 9 habits · 1,284 entries",
		);
		expect(exportRowSubtitle(1, 0)).toBe("One file · 1 habit · 0 entries");
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
