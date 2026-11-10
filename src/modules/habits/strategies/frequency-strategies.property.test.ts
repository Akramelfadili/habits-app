import fc from "fast-check";
import { TEST_ZONES, withTimeZone } from "@/test-support/time-zone";
import { frequencyArb, isoWeekdayArb } from "../test-support/habit-arbitraries";
import type { Frequency, IsoWeekday } from "../types";
import { getFrequencyStrategy } from "./frequency-strategy";

/**
 * Each frequency strategy against a deliberately plain reference written from
 * the rule's wording (frequency-strategy.ts, per-week-frequency.ts), over random
 * completion logs, in every zone of the date matrix. It does not replace
 * `per-week-frequency.equivalence.slow.test.ts`, which also pins the history and
 * summary functions built on the strategies.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) =>
	`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoWeekday = (d: Date): IsoWeekday =>
	(d.getDay() === 0 ? 7 : d.getDay()) as IsoWeekday;
const shift = (d: Date, days: number) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

function weekKeys(d: Date): string[] {
	const monday = shift(d, -((d.getDay() + 6) % 7));
	return Array.from({ length: 7 }, (_, i) => keyOf(shift(monday, i)));
}

type Reference = {
	isDueOn: (date: Date, completed: Set<string>) => boolean;
	wasScheduledOn: (date: Date, completed: Set<string>) => boolean;
	canFallOn: (weekday: IsoWeekday) => boolean;
};

function referenceFor(frequency: Frequency): Reference {
	if (frequency.type === "daily") {
		return {
			isDueOn: () => true,
			wasScheduledOn: () => true,
			canFallOn: () => true,
		};
	}
	if (frequency.type === "weekdays") {
		const onDay = (date: Date) => frequency.days.includes(isoWeekday(date));
		return {
			isDueOn: onDay,
			wasScheduledOn: onDay,
			canFallOn: (weekday) => frequency.days.includes(weekday),
		};
	}
	const target = frequency.timesPerWeek;
	return {
		isDueOn: (date, completed) =>
			weekKeys(date).filter((k) => k < keyOf(date) && completed.has(k)).length <
			target,
		wasScheduledOn: (date, completed) => {
			if (completed.has(keyOf(date))) return true;
			const week = weekKeys(date);
			const missing = target - week.filter((k) => completed.has(k)).length;
			if (missing <= 0) return false;
			const open = week.filter((k) => !completed.has(k));
			return open.slice(-missing).includes(keyOf(date));
		},
		canFallOn: () => true,
	};
}

/** Four weeks of completion offsets from a base day, over 2015-2030 so DST changes fall inside. */
const scenarioArb = fc.record({
	frequency: frequencyArb,
	baseDay: fc.integer({ min: 0, max: 5800 }),
	completedOffsets: fc.uniqueArray(fc.integer({ min: 0, max: 27 }), {
		maxLength: 28,
	}),
});

describe.each(TEST_ZONES)("frequency strategies in %s", (zone) => {
	it("agree with their reference on random logs", () => {
		withTimeZone(zone, () => {
			fc.assert(
				fc.property(scenarioArb, ({ frequency, baseDay, completedOffsets }) => {
					const base = new Date(2015, 0, 1 + baseDay);
					const completedDates = completedOffsets.map((n) => shift(base, n));
					const completed = new Set(completedDates.map(keyOf));
					const strategy = getFrequencyStrategy(frequency);
					const reference = referenceFor(frequency);
					for (let n = -7; n <= 35; n++) {
						const date = shift(base, n);
						expect({
							day: keyOf(date),
							due: strategy.isDueOn(date, { completedDates }),
							scheduled: strategy.wasScheduledOn(date, { completedDates }),
						}).toEqual({
							day: keyOf(date),
							due: reference.isDueOn(date, completed),
							scheduled: reference.wasScheduledOn(date, completed),
						});
					}
				}),
				{ numRuns: 100 },
			);
		});
	});

	it("canFallOn matches the reference for every weekday", () => {
		withTimeZone(zone, () => {
			fc.assert(
				fc.property(frequencyArb, isoWeekdayArb, (frequency, weekday) => {
					return (
						getFrequencyStrategy(frequency).canFallOn(weekday) ===
						referenceFor(frequency).canFallOn(weekday)
					);
				}),
				{ numRuns: 100 },
			);
		});
	});
});
