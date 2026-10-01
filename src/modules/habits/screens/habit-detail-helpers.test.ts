import { makeHabit } from "../test-support/habit-builder";
import type { Entry, Frequency } from "../types";
import {
	completionRateCaption,
	completionRateValue,
	entryDateLabel,
	entryValueLabel,
	frequencyLabel,
	habitSubtitle,
	heatmapRangeLabel,
	longestStreakCaption,
	notLoggedLabel,
} from "./habit-detail-helpers";

const today = new Date(2026, 8, 23, 12);

function entry(value?: number): Entry {
	return { id: 1, habitId: 1, date: "2026-09-23", value, createdAt: today };
}

describe("frequencyLabel", () => {
	it.each<[Frequency, string]>([
		[{ type: "daily" }, "daily"],
		[{ type: "per-week", timesPerWeek: 3 }, "3× a week"],
		[{ type: "weekdays", days: [1, 2, 3, 4, 5] }, "Mon–Fri"],
		[{ type: "weekdays", days: [5, 1, 3] }, "Mon, Wed, Fri"],
		[{ type: "weekdays", days: [6, 7] }, "Sat, Sun"],
		[{ type: "weekdays", days: [1, 2, 3, 4, 5, 6, 7] }, "daily"],
	])("describes %j as %s", (frequency, label) => {
		expect(frequencyLabel(frequency)).toBe(label);
	});
});

describe("habitSubtitle", () => {
	it("joins category, quantity target, and cadence", () => {
		const habit = makeHabit({
			category: "Morning",
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
			createdAt: new Date(2026, 0, 1),
		});
		expect(habitSubtitle(habit, today)).toBe("Morning · 8 glasses · daily");
	});

	it("notes a habit added today and falls back to the no-category label", () => {
		const habit = makeHabit({
			category: null,
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
			createdAt: today,
		});
		expect(habitSubtitle(habit, today)).toBe("Anytime · Mon–Fri · added today");
	});
});

describe("stat tile copy", () => {
	it("describes the longest streak by the month it ended", () => {
		expect(
			longestStreakCaption({ days: 41, endedOn: new Date(2026, 5, 30) }),
		).toBe("days, in Jun");
		expect(longestStreakCaption({ days: 1, endedOn: today })).toBe(
			"day, in Sep",
		);
		expect(longestStreakCaption({ days: 0, endedOn: null })).toBe(
			"no streak yet",
		);
	});

	it("shows a percentage, or a dash when nothing's been scheduled", () => {
		const rate = { completed: 78, scheduled: 90, fraction: 78 / 90 };
		expect(completionRateValue(rate)).toBe("87%");
		expect(completionRateCaption(rate)).toBe("78 of 90 days");
		expect(
			completionRateValue({ completed: 0, scheduled: 0, fraction: null }),
		).toBe("—");
	});
});

describe("entry labels", () => {
	it("names today and yesterday, otherwise a short date", () => {
		expect(entryDateLabel("2026-09-23", today)).toBe("Today");
		expect(entryDateLabel("2026-09-22", today)).toBe("Yesterday");
		expect(entryDateLabel("2026-09-15", today)).toBe("Tue 15 Sep");
	});

	it("shows value / target for quantity, Done/Resisted for simple checks", () => {
		const quantity = makeHabit({ targetType: "quantity", targetAmount: 8 });
		expect(entryValueLabel(quantity, entry(6))).toBe("6 / 8");
		expect(entryValueLabel(makeHabit(), entry())).toBe("Done");
		expect(entryValueLabel(makeHabit({ direction: "break" }), entry())).toBe(
			"Resisted",
		);
	});
});

describe("heatmapRangeLabel", () => {
	it("spans first to last month, or collapses to one", () => {
		expect(heatmapRangeLabel(new Date(2026, 6, 20), today)).toBe("Jul — Sep");
		expect(heatmapRangeLabel(new Date(2026, 8, 1), today)).toBe("Sep");
	});
});

describe("notLoggedLabel", () => {
	it("says not logged, or not resisted for a Break habit", () => {
		expect(notLoggedLabel(makeHabit())).toBe("Not logged");
		expect(notLoggedLabel(makeHabit({ direction: "break" }))).toBe(
			"Not resisted",
		);
	});
});
