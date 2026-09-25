import { makeHabit } from "../test-support/habit-builder";
import {
	celebratoryHeadline,
	computeProgress,
	groupHabitsByCategory,
	resolveTodayViewState,
} from "./today-screen-helpers";

describe("groupHabitsByCategory", () => {
	it("groups habits under the category they share", () => {
		const morningHabit = makeHabit({ id: 1, category: "Morning" });
		const anotherMorningHabit = makeHabit({ id: 2, category: "Morning" });

		const groups = groupHabitsByCategory([morningHabit, anotherMorningHabit]);

		expect(groups).toEqual([
			{ category: "Morning", habits: [morningHabit, anotherMorningHabit] },
		]);
	});

	it("orders groups by first-appearance in the given (creation-ordered) list", () => {
		const evening = makeHabit({ id: 1, category: "Evening" });
		const morning = makeHabit({ id: 2, category: "Morning" });
		const secondEvening = makeHabit({ id: 3, category: "Evening" });

		const groups = groupHabitsByCategory([evening, morning, secondEvening]);

		expect(groups.map((group) => group.category)).toEqual([
			"Evening",
			"Morning",
		]);
	});

	it("puts no-category habits under Anytime, last, regardless of creation order", () => {
		const noCategory = makeHabit({ id: 1, category: null });
		const morning = makeHabit({ id: 2, category: "Morning" });

		const groups = groupHabitsByCategory([noCategory, morning]);

		expect(groups.map((group) => group.category)).toEqual([
			"Morning",
			"Anytime",
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
