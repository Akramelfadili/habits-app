import type { Frequency } from "../types";
import {
	canHabitFallOn,
	getFrequencyStrategy,
	getHabitStrategy,
	isHabitDueOn,
} from "./frequency-strategy";

const monday = new Date(2026, 8, 21, 9);

describe("frequency-strategy", () => {
	it.each<[Frequency, boolean]>([
		[{ type: "daily" }, true],
		[{ type: "weekdays", days: [2] }, false],
		[{ type: "per-week", timesPerWeek: 1 }, true],
	])("resolves the strategy for %j", (frequency, expected) => {
		expect(
			getFrequencyStrategy(frequency).isDueOn(monday, { completedDates: [] }),
		).toBe(expected);
	});

	it("isHabitDueOn defaults to no completions", () => {
		expect(
			isHabitDueOn(
				{
					frequency: { type: "per-week", timesPerWeek: 2 },
					archivedAt: null,
					pauses: [],
				},
				monday,
			),
		).toBe(true);
	});

	it("canHabitFallOn delegates to the habit's strategy", () => {
		expect(canHabitFallOn({ frequency: { type: "daily" } }, 6)).toBe(true);
		expect(
			canHabitFallOn({ frequency: { type: "weekdays", days: [1] } }, 6),
		).toBe(false);
	});

	describe("getHabitStrategy", () => {
		const daily = { frequency: { type: "daily" } as const };

		it("is the plain frequency rule for an active habit with no past pauses", () => {
			const strategy = getHabitStrategy({
				...daily,
				archivedAt: null,
				pauses: [],
			});
			expect(strategy.isDueOn(monday, { completedDates: [] })).toBe(true);
		});

		it("pauses every day from the archive day on while archived", () => {
			const strategy = getHabitStrategy({
				...daily,
				archivedAt: new Date(2026, 8, 20, 18),
				pauses: [],
			});
			const context = { completedDates: [] };
			expect(strategy.isDueOn(new Date(2026, 8, 19), context)).toBe(true);
			expect(strategy.isDueOn(new Date(2026, 8, 20), context)).toBe(false);
			expect(strategy.isDueOn(monday, context)).toBe(false);
		});

		it("keeps past pauses after a restore", () => {
			const strategy = getHabitStrategy({
				...daily,
				archivedAt: null,
				pauses: [{ from: "2026-09-10", to: "2026-09-15" }],
			});
			const context = { completedDates: [] };
			expect(strategy.wasScheduledOn(new Date(2026, 8, 12), context)).toBe(
				false,
			);
			expect(strategy.wasScheduledOn(new Date(2026, 8, 16), context)).toBe(
				true,
			);
		});
	});
});
