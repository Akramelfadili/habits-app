import {
	categoryNamed,
	makeCategory,
	makeHabit,
} from "../test-support/habit-builder";
import {
	allDoneBody,
	bonusRowStatus,
	computeProgress,
	foldSummary,
	groupHabitsByCategory,
	resolveTodayViewState,
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

		const groups = groupHabitsByCategory(
			[morningHabit, anotherMorningHabit],
			[],
		);

		expect(groups).toEqual([
			{
				category: categoryNamed("Morning"),
				habits: [morningHabit, anotherMorningHabit],
			},
		]);
	});

	it("orders groups by the stored category order (HAB-42), not habit order", () => {
		const evening = makeHabit({ id: 1, category: categoryNamed("Evening") });
		const morning = makeHabit({ id: 2, category: categoryNamed("Morning") });
		const secondEvening = makeHabit({
			id: 3,
			category: categoryNamed("Evening"),
		});

		const groups = groupHabitsByCategory(
			[evening, morning, secondEvening],
			[categoryNamed("Morning"), categoryNamed("Evening")],
		);

		expect(groups.map((group) => group.category.name)).toEqual([
			"Morning",
			"Evening",
		]);
		expect(groups[1].habits).toEqual([evening, secondEvening]);
	});

	it("puts categories the stored order doesn't know after the known ones, in first appearance", () => {
		const evening = makeHabit({ id: 1, category: categoryNamed("Evening") });
		const training = makeHabit({ id: 2, category: categoryNamed("Training") });
		const morning = makeHabit({ id: 3, category: categoryNamed("Morning") });

		const groups = groupHabitsByCategory(
			[evening, training, morning],
			[categoryNamed("Morning")],
		);

		expect(groups.map((group) => group.category.name)).toEqual([
			"Morning",
			"Evening",
			"Training",
		]);
	});

	it("keeps Other last even when it is stored first", () => {
		const other = makeHabit({ id: 1, category: categoryNamed("Other") });
		const morning = makeHabit({ id: 2, category: categoryNamed("Morning") });

		const groups = groupHabitsByCategory(
			[other, morning],
			[categoryNamed("Other"), categoryNamed("Morning")],
		);

		expect(groups.map((group) => group.category.name)).toEqual([
			"Morning",
			"Other",
		]);
	});

	it("puts Other (V1's Anytime) last, regardless of creation order", () => {
		const noCategory = makeHabit({ id: 1, category: categoryNamed("Other") });
		const morning = makeHabit({ id: 2, category: categoryNamed("Morning") });

		const groups = groupHabitsByCategory([noCategory, morning], []);

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

		const groups = groupHabitsByCategory([custom, morning], []);

		expect(groups.map((group) => group.category.id)).toEqual([
			50,
			categoryNamed("Morning").id,
		]);
	});

	it("returns an empty array for no habits", () => {
		expect(groupHabitsByCategory([], [])).toEqual([]);
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

	it("stays populated when every due habit is completed (no day-closed state)", () => {
		expect(
			resolveTodayViewState({
				totalHabitCount: 3,
				progress: { completed: 2, total: 2, fraction: 1 },
			}),
		).toBe("populated");
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

describe("foldSummary (T1)", () => {
	const names = ["Upper body", "Cold shower", "Stretch"].map((name, index) =>
		makeHabit({ id: index + 1, name }),
	);

	it("names the one habit not due today", () => {
		expect(foldSummary(names.slice(0, 1), true)).toBe(
			"1 not due today · Upper body",
		);
	});

	it("names two, then counts the rest", () => {
		expect(foldSummary(names, true)).toBe(
			"3 not due today · Upper body, Cold shower +1",
		);
	});

	it("drops 'today' on a past day", () => {
		expect(foldSummary(names.slice(0, 1), false)).toBe(
			"1 not due · Upper body",
		);
	});
});

describe("bonusRowStatus (T3)", () => {
	it("invites a bonus log, naming the schedule", () => {
		const habit = makeHabit({ frequency: { type: "weekdays", days: [2, 4] } });
		expect(bonusRowStatus(habit, 0, false)).toBe(
			"Tue, Thu · tap to log a bonus",
		);
	});

	it("says a met per-week habit is back Monday", () => {
		const habit = makeHabit({
			frequency: { type: "per-week", timesPerWeek: 3 },
		});
		expect(bonusRowStatus(habit, 3, true)).toBe(
			"3 of 3 this week · back Monday",
		);
	});

	it("says a logged bonus changes no streak", () => {
		expect(bonusRowStatus(makeHabit({}), 0, true)).toBe(
			"Bonus · streak unchanged",
		);
	});
});

describe("allDoneBody (T8)", () => {
	const habits = [
		makeHabit({ id: 1, name: "Meditate" }),
		makeHabit({ id: 2, name: "Read" }),
	];

	it("names the longest streak", () => {
		expect(
			allDoneBody(
				habits,
				new Map([
					[1, 13],
					[2, 12],
				]),
			),
		).toBe("2 of 2 · Meditate is on a 13-day streak");
	});

	it("is just the count when nothing has a streak worth naming", () => {
		expect(allDoneBody(habits, new Map())).toBe("2 of 2");
	});
});
