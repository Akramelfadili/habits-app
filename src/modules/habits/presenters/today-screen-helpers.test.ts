import {
	categoryNamed,
	makeCategory,
	makeHabit,
} from "../test-support/habit-builder";
import {
	celebratoryHeadline,
	computeProgress,
	groupHabitsByCategory,
	resolveTodayViewState,
	todayRowSubtitle,
} from "./today-screen-helpers";

describe("groupHabitsByCategory", () => {
	it("groups habits under the category they share", () => {
		const morningHabit = makeHabit({
			id: 1,
			category: categoryNamed("Morning"),
		});
		const anotherMorningHabit = makeHabit({
			id: 2,
			category: categoryNamed("Morning"),
		});

		const groups = groupHabitsByCategory([morningHabit, anotherMorningHabit]);

		expect(groups).toEqual([
			{
				category: categoryNamed("Morning"),
				habits: [morningHabit, anotherMorningHabit],
			},
		]);
	});

	it("orders groups by first-appearance in the given (creation-ordered) list", () => {
		const evening = makeHabit({ id: 1, category: categoryNamed("Evening") });
		const morning = makeHabit({ id: 2, category: categoryNamed("Morning") });
		const secondEvening = makeHabit({
			id: 3,
			category: categoryNamed("Evening"),
		});

		const groups = groupHabitsByCategory([evening, morning, secondEvening]);

		expect(groups.map((group) => group.category.name)).toEqual([
			"Evening",
			"Morning",
		]);
	});

	it("puts Other (V1's Anytime) last, regardless of creation order", () => {
		const noCategory = makeHabit({ id: 1, category: categoryNamed("Other") });
		const morning = makeHabit({ id: 2, category: categoryNamed("Morning") });

		const groups = groupHabitsByCategory([noCategory, morning]);

		expect(groups.map((group) => group.category.name)).toEqual([
			"Morning",
			"Other",
		]);
	});

	it("groups by category identity, not name — and only the built-in Other goes last", () => {
		// A custom that happens to be called "Other" can't exist (duplicate
		// check), but grouping must still key on id, not the display name.
		const customOther = makeCategory({ id: 50, name: "Other" });
		const custom = makeHabit({ id: 1, category: customOther });
		const morning = makeHabit({ id: 2, category: categoryNamed("Morning") });

		const groups = groupHabitsByCategory([custom, morning]);

		expect(groups.map((group) => group.category.id)).toEqual([
			50,
			categoryNamed("Morning").id,
		]);
	});

	it("returns an empty array for no habits", () => {
		expect(groupHabitsByCategory([])).toEqual([]);
	});
});

describe("computeProgress", () => {
	it("counts completed habits among those due", () => {
		const habits = [
			makeHabit({ id: 1 }),
			makeHabit({ id: 2 }),
			makeHabit({ id: 3 }),
		];
		const progress = computeProgress(habits, new Set([1, 3]));

		expect(progress).toEqual({ completed: 2, total: 3, fraction: 2 / 3 });
	});

	it("returns a 0 fraction, not NaN, when nothing is due", () => {
		expect(computeProgress([], new Set())).toEqual({
			completed: 0,
			total: 0,
			fraction: 0,
		});
	});
});

describe("resolveTodayViewState", () => {
	it("is no-habits when zero habits have ever been created", () => {
		expect(
			resolveTodayViewState({
				totalHabitCount: 0,
				progress: { completed: 0, total: 0, fraction: 0 },
			}),
		).toBe("no-habits");
	});

	it("prefers no-habits over rest-day when both conditions could apply", () => {
		expect(
			resolveTodayViewState({
				totalHabitCount: 0,
				progress: { completed: 0, total: 0, fraction: 0 },
			}),
		).toBe("no-habits");
	});

	it("is rest-day when habits exist but none are due today", () => {
		expect(
			resolveTodayViewState({
				totalHabitCount: 3,
				progress: { completed: 0, total: 0, fraction: 0 },
			}),
		).toBe("rest-day");
	});

	it("is day-closed when every due habit is completed", () => {
		expect(
			resolveTodayViewState({
				totalHabitCount: 3,
				progress: { completed: 2, total: 2, fraction: 1 },
			}),
		).toBe("day-closed");
	});

	it("is populated when some due habits remain uncompleted", () => {
		expect(
			resolveTodayViewState({
				totalHabitCount: 3,
				progress: { completed: 1, total: 2, fraction: 0.5 },
			}),
		).toBe("populated");
	});
});

describe("celebratoryHeadline", () => {
	it("spells out small counts as words", () => {
		expect(celebratoryHeadline(6)).toBe("All six done");
		expect(celebratoryHeadline(7)).toBe("All seven done");
		expect(celebratoryHeadline(1)).toBe("All one done");
	});

	it("falls back to digits past the word list", () => {
		expect(celebratoryHeadline(13)).toBe("All 13 done");
	});
});

describe("todayRowSubtitle", () => {
	it("is a quantity habit's target", () => {
		const habit = makeHabit({
			targetType: "quantity",
			targetAmount: 20,
			targetUnit: "pages",
		});
		expect(todayRowSubtitle(habit, 0)).toBe("20 pages");
	});

	it("is a per-week habit's standing this week", () => {
		const habit = makeHabit({
			frequency: { type: "per-week", timesPerWeek: 5 },
		});
		expect(todayRowSubtitle(habit, 2)).toBe("2 of 5 this week");
	});

	it("joins both for a per-week quantity habit", () => {
		const habit = makeHabit({
			targetType: "quantity",
			targetAmount: 5,
			targetUnit: "km",
			frequency: { type: "per-week", timesPerWeek: 3 },
		});
		expect(todayRowSubtitle(habit, 1)).toBe("5 km · 1 of 3 this week");
	});

	it("is empty for a plain daily or weekday check", () => {
		expect(
			todayRowSubtitle(makeHabit({ frequency: { type: "daily" } }), 3),
		).toBeUndefined();
		expect(
			todayRowSubtitle(
				makeHabit({ frequency: { type: "weekdays", days: [1, 3, 5] } }),
				2,
			),
		).toBeUndefined();
	});
});
