import { createDailyFrequency } from "./daily-frequency";
import {
	isPausedOn,
	OPEN_PAUSE_END,
	restartDays,
	withPauses,
} from "./paused-schedule";
import { createSpecificWeekdaysFrequency } from "./specific-weekdays-frequency";

const daily = createDailyFrequency({ type: "daily" });
const pauses = [{ from: "2026-09-10", to: "2026-09-12" }];

describe("withPauses", () => {
	it("returns the wrapped strategy untouched when there are no pauses", () => {
		expect(withPauses(daily, [])).toBe(daily);
	});

	it("is never due on a paused day, and due as usual either side of it", () => {
		const strategy = withPauses(daily, pauses);
		const context = { completedDates: [] };

		expect(strategy.isDueOn(new Date(2026, 8, 9), context)).toBe(true);
		expect(strategy.isDueOn(new Date(2026, 8, 10), context)).toBe(false);
		expect(strategy.isDueOn(new Date(2026, 8, 12, 23), context)).toBe(false);
		expect(strategy.isDueOn(new Date(2026, 8, 13), context)).toBe(true);
	});

	it("treats a blank paused day as unscheduled, so it can't be missed", () => {
		const strategy = withPauses(daily, pauses);
		expect(
			strategy.wasScheduledOn(new Date(2026, 8, 11), { completedDates: [] }),
		).toBe(false);
	});

	it("still counts a paused day that was actually completed", () => {
		const strategy = withPauses(daily, pauses);
		expect(
			strategy.wasScheduledOn(new Date(2026, 8, 10), {
				completedDates: [new Date(2026, 8, 10)],
			}),
		).toBe(true);
	});

	it("covers every later day with an open pause", () => {
		const strategy = withPauses(daily, [
			{ from: "2026-09-10", to: OPEN_PAUSE_END },
		]);
		expect(strategy.isDueOn(new Date(2031, 0, 1), { completedDates: [] })).toBe(
			false,
		);
	});

	it("delegates canFallOn — a pause doesn't change which weekdays a habit can land on", () => {
		const strategy = withPauses(
			createSpecificWeekdaysFrequency({ type: "weekdays", days: [1] }),
			pauses,
		);
		expect(strategy.canFallOn(1)).toBe(true);
		expect(strategy.canFallOn(2)).toBe(false);
	});
});

describe("restartDays (HAB-20)", () => {
	it("is the day after each pause ends — the restore day — in order", () => {
		expect(
			restartDays([
				{ from: "2026-09-10", to: "2026-09-12" },
				{ from: "2026-08-01", to: "2026-08-31" },
			]),
		).toEqual(["2026-09-01", "2026-09-13"]);
	});

	it("is empty with no pauses, so an unpaused habit's streak is untouched", () => {
		expect(restartDays([])).toEqual([]);
	});

	it("doesn't make the pause itself bridge a streak: paused days stay unscheduled", () => {
		const strategy = withPauses(daily, pauses);
		expect(
			strategy.wasScheduledOn(new Date(2026, 8, 11), { completedDates: [] }),
		).toBe(false);
	});
});

describe("isPausedOn", () => {
	it("is inclusive at both ends", () => {
		expect(isPausedOn(new Date(2026, 8, 10), pauses)).toBe(true);
		expect(isPausedOn(new Date(2026, 8, 12, 23), pauses)).toBe(true);
		expect(isPausedOn(new Date(2026, 8, 13), pauses)).toBe(false);
	});
});
