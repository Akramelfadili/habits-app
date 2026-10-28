import { makeHabit } from "../test-support/habit-builder";
import type { Habit } from "../types";
import { progressInsights } from "./progress-insights";
import type { RangeHabitRow, RangeSummary } from "./range-summary";

const today = new Date(2026, 9, 21, 12);
const longAgo = new Date(2025, 0, 1);

function row(
	habit: Habit,
	overrides: Partial<RangeHabitRow> = {},
): RangeHabitRow {
	return {
		habit,
		isBreak: false,
		done: 8,
		due: 10,
		frozen: 0,
		bonus: 0,
		rate: 80,
		previousRate: 80,
		previous: { done: 8, due: 10 },
		deltaPoints: 0,
		slipping: false,
		...overrides,
	};
}

function summary(
	habits: RangeHabitRow[],
	overrides: Partial<RangeSummary> = {},
): RangeSummary {
	const done = habits.reduce((sum, r) => sum + r.done, 0);
	const due = habits.reduce((sum, r) => sum + r.due, 0);
	return {
		kind: "month",
		window: { start: today, end: today },
		previousWindow: { start: today, end: today },
		done,
		due,
		rate: due ? Math.round((done / due) * 100) : null,
		previousRate: null,
		deltaPoints: null,
		perfectDays: 0,
		countedDays: 0,
		bestStreak: null,
		bestDay: null,
		weekdays: [],
		habits,
		bonus: [],
		freezes: [],
		...overrides,
	};
}

const read = makeHabit({ id: 1, name: "Read", createdAt: longAgo });
const meditate = makeHabit({ id: 2, name: "Meditate", createdAt: longAgo });
const water = makeHabit({ id: 3, name: "Water", createdAt: longAgo });

const slippingRow = row(read, {
	done: 3,
	due: 5,
	rate: 60,
	previousRate: 100,
	previous: { done: 7, due: 7 },
	deltaPoints: -40,
	slipping: true,
});
const improvedRow = row(meditate, {
	done: 9,
	due: 10,
	rate: 90,
	previousRate: 70,
	previous: { done: 7, due: 10 },
	deltaPoints: 20,
});

const base = { unlocked: true, today };

describe("progressInsights", () => {
	it("says nothing while the 7-day gate is closed", () => {
		expect(
			progressInsights({
				...base,
				unlocked: false,
				summary: summary([slippingRow]),
			}),
		).toEqual([]);
	});

	it("says nothing when nothing was due", () => {
		expect(progressInsights({ ...base, summary: summary([]) })).toEqual([]);
	});

	it("a perfect range is nothing to fix, ahead of anything else", () => {
		const perfect = row(read, { done: 10, due: 10, rate: 100 });
		expect(progressInsights({ ...base, summary: summary([perfect]) })).toEqual([
			{
				kind: "nothing-to-fix",
				tone: "positive",
				reason: "perfect",
				action: null,
			},
		]);
	});

	it("ranks slipping, then improved, and a slipping card carries Change frequency", () => {
		const result = progressInsights({
			...base,
			summary: summary([improvedRow, slippingRow]),
		});
		expect(result.map((i) => [i.kind, i.tone])).toEqual([
			["slipping", "warning"],
			["improved", "positive"],
		]);
		expect(result[0].action).toEqual({
			type: "edit-habit",
			habitId: 1,
			focus: "frequency",
		});
		expect(result[1].action).toBeNull();
		expect(result[0]).toMatchObject({
			stats: { done: 3, due: 5, previousDone: 7, previousDue: 7 },
		});
	});

	it("puts 'nothing to fix' after improved when nothing is slipping", () => {
		const result = progressInsights({
			...base,
			summary: summary([improvedRow, row(water)]),
		});
		expect(result.map((i) => i.kind)).toEqual(["improved", "nothing-to-fix"]);
		expect(result[1].action).toBeNull();
	});

	it("is a neutral 'nothing to fix' when nothing changed either way", () => {
		const result = progressInsights({
			...base,
			summary: summary([row(water)]),
		});
		expect(result).toEqual([
			{
				kind: "nothing-to-fix",
				tone: "neutral",
				reason: "steady",
				action: null,
			},
		]);
	});

	it("never names an archived habit", () => {
		const archived = row(
			{ ...read, archivedAt: new Date(2026, 8, 1) },
			{ slipping: true, rate: 20 },
		);
		const result = progressInsights({
			...base,
			summary: summary([archived, row(water)]),
		});
		expect(result.every((i) => i.kind !== "slipping")).toBe(true);
	});

	it("caps the list at three, worst slipping first", () => {
		const slippers = [10, 11, 12, 13].map((id, index) =>
			row(makeHabit({ id, createdAt: longAgo }), {
				slipping: true,
				rate: 50 - index * 10,
				previousRate: 100,
				deltaPoints: -50 + index * 10,
			}),
		);
		const result = progressInsights({ ...base, summary: summary(slippers) });
		expect(result).toHaveLength(3);
		expect(
			result.map((i) => (i.kind === "slipping" ? i.habit.id : null)),
		).toEqual([13, 12, 11]);
	});

	it("does not call a small gain 'improved', or one on too few due days", () => {
		const small = row(meditate, { deltaPoints: 9, rate: 89, previousRate: 80 });
		const thin = row(water, {
			due: 2,
			done: 2,
			rate: 100,
			previousRate: 50,
			deltaPoints: 50,
		});
		const result = progressInsights({
			...base,
			summary: summary([small, thin, slippingRow]),
		});
		expect(result.map((i) => i.kind)).toEqual(["slipping"]);
	});

	describe("year", () => {
		const firstDay = new Date(2026, 0, 5);
		const year = (rows: RangeHabitRow[]) => summary(rows, { kind: "year" });

		it("needs three months of history", () => {
			const early = progressInsights({
				...base,
				summary: year([slippingRow]),
				firstDay: new Date(2026, 8, 1),
			});
			expect(early).toEqual([]);
			expect(
				progressInsights({
					...base,
					summary: year([slippingRow]),
					firstDay,
				}).map((i) => i.kind),
			).toEqual(["slipping"]);
		});

		it("adds the best month as an improved card", () => {
			const result = progressInsights({
				...base,
				summary: year([row(water)]),
				firstDay,
				bestMonth: { month: new Date(2026, 8, 1), percent: 100 },
			});
			expect(result[0]).toMatchObject({
				kind: "improved",
				reason: "best-month",
				percent: 100,
				action: null,
			});
		});
	});
});
