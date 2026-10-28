import { categoryNamed, makeHabit } from "../test-support/habit-builder";
import type { Entry, Frequency } from "../types";
import {
	archivedBannerDetail,
	archivedBannerTitle,
	completionRateCaption,
	completionRateLabel,
	completionRateValue,
	currentStreakTile,
	entryDateLabel,
	entryValueLabel,
	frequencyLabel,
	habitSubtitle,
	heatmapRangeLabel,
	heatmapRangeLabelFor,
	legendFrozenLabel,
	longestStreakCaption,
	notLoggedLabel,
	restoredToastMessage,
	streakResetNote,
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
			category: categoryNamed("Morning"),
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
			createdAt: new Date(2026, 0, 1),
		});
		expect(habitSubtitle(habit, today)).toBe("Morning · 8 glasses · daily");
	});

	it("notes a habit added today, under Other like any category", () => {
		const habit = makeHabit({
			category: categoryNamed("Other"),
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
			createdAt: today,
		});
		expect(habitSubtitle(habit, today)).toBe("Other · Mon–Fri · added today");
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
		const rate = {
			completed: 78,
			scheduled: 90,
			frozen: 0,
			fraction: 78 / 90,
			skippedPaused: false,
		};
		expect(completionRateValue(rate)).toBe("87%");
		expect(completionRateCaption(rate)).toBe("78 of 90 days");
		expect(
			completionRateValue({
				completed: 0,
				scheduled: 0,
				frozen: 0,
				fraction: null,
				skippedPaused: false,
			}),
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
		expect(heatmapRangeLabel(new Date(2026, 6, 20), today)).toBe("Jul – Sep");
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

describe("archive and restore copy (HAB-20)", () => {
	const archived = makeHabit({ archivedAt: new Date(2026, 8, 2, 20) });

	it("words the banner from the archive date and the log count", () => {
		expect(archivedBannerTitle(archived.archivedAt as Date)).toBe(
			"Archived on 2 September",
		);
		expect(archivedBannerDetail(41)).toBe(
			"Hidden from Today. All 41 days logged are kept.",
		);
		expect(archivedBannerDetail(1)).toBe(
			"Hidden from Today. Its 1 day logged is kept.",
		);
		expect(archivedBannerDetail(0)).toBe(
			"Hidden from Today. Nothing logged yet.",
		);
	});

	it("names the habit in the restore toast", () => {
		expect(restoredToastMessage("Cold shower")).toBe(
			"Restored 'Cold shower' — back on Today",
		);
	});

	it("reads the Current tile as paused while archived, and fresh after a restore", () => {
		expect(currentStreakTile(archived, 12)).toEqual({
			value: "—",
			caption: "paused",
			muted: true,
		});
		const restored = makeHabit({
			pauses: [{ from: "2026-09-02", to: "2026-09-14" }],
		});
		expect(currentStreakTile(restored, 0).value).toBe("0");
		expect(currentStreakTile(restored, 0).caption).toBe(
			"next log starts a streak",
		);
		expect(currentStreakTile(restored, 3)).toMatchObject({
			value: "3",
			caption: "day streak",
			muted: false,
		});
		expect(currentStreakTile(makeHabit(), 0).caption).toBe("day streak");
		// Once something's been logged since the restore, a 0 is an ordinary miss.
		expect(currentStreakTile(restored, 0, true).caption).toBe("day streak");
	});

	it("relabels the 90-day tile before archive, and says paused days were skipped", () => {
		expect(completionRateLabel(archived)).toBe("Before archive");
		expect(completionRateLabel(makeHabit())).toBe("90 days");
		expect(
			completionRateCaption({
				completed: 20,
				scheduled: 30,
				frozen: 0,
				fraction: 2 / 3,
				skippedPaused: true,
			}),
		).toBe("paused days skipped");
	});

	it("marks where the heatmap's history ended or paused", () => {
		const first = new Date(2026, 6, 20);
		const today = new Date(2026, 8, 23);
		expect(heatmapRangeLabelFor(makeHabit(), first, today)).toBe("Jul – Sep");
		expect(heatmapRangeLabelFor(archived, first, today)).toBe(
			"Jul – Sep · ended 2 Sep",
		);
		const restored = makeHabit({
			pauses: [{ from: "2026-09-02", to: "2026-09-14" }],
		});
		expect(heatmapRangeLabelFor(restored, first, today)).toBe(
			"Jul – Sep · paused 2 – 15 Sep",
		);
		const old = makeHabit({
			pauses: [{ from: "2026-01-02", to: "2026-01-14" }],
		});
		expect(heatmapRangeLabelFor(old, first, today)).toBe("Jul – Sep");
	});

	it("carries the live freeze count in the legend, and no count once archived (VAR-09)", () => {
		expect(legendFrozenLabel(makeHabit(), 0)).toBe("0 freezes left");
		expect(legendFrozenLabel(makeHabit(), 1)).toBe("1 freeze left");
		expect(legendFrozenLabel(archived, 2)).toBeUndefined();
	});

	it("explains a streak reset with the refill date", () => {
		expect(streakResetNote(new Date(2026, 9, 1))).toBe(
			"Streak reset — no freezes left this month. Pool refills on 1 October.",
		);
	});
});
