import { addDays } from "date-fns";
import { createPerWeekFrequency } from "./per-week-frequency";

const monday = new Date(2026, 8, 21, 9);
const day = (offset: number) => addDays(monday, offset);
const threePerWeek = createPerWeekFrequency({
	type: "per-week",
	timesPerWeek: 3,
});

describe("X-per-week frequency", () => {
	it("is due every day while the weekly count is below target", () => {
		const completedDates = [day(0), day(1)];
		for (let offset = 2; offset < 7; offset++) {
			expect(threePerWeek.isDueOn(day(offset), { completedDates })).toBe(true);
		}
	});

	it("stays due on the day the target is hit, then drops off for days 4–7", () => {
		const completedDates = [day(0), day(1), day(2)];

		expect(threePerWeek.isDueOn(day(2), { completedDates })).toBe(true);
		for (let offset = 3; offset < 7; offset++) {
			expect(threePerWeek.isDueOn(day(offset), { completedDates })).toBe(false);
		}
	});

	it("resets on the following Monday", () => {
		const completedDates = [day(0), day(1), day(2)];
		expect(threePerWeek.isDueOn(day(7), { completedDates })).toBe(true);
	});

	it("ignores completions from the previous week (Sunday is the week's last day)", () => {
		const completedDates = [day(-3), day(-2), day(-1)];
		expect(threePerWeek.isDueOn(monday, { completedDates })).toBe(true);
	});

	it("counts a completion earlier the same day as not yet 'before' today", () => {
		const earlierToday = new Date(2026, 8, 23, 7);
		const onceAWeek = createPerWeekFrequency({
			type: "per-week",
			timesPerWeek: 1,
		});
		expect(
			onceAWeek.isDueOn(new Date(2026, 8, 23, 20), {
				completedDates: [earlierToday],
			}),
		).toBe(true);
	});
});

describe("X-per-week frequency, looking back (wasScheduledOn)", () => {
	const scheduledDays = (completedDates: Date[]) =>
		[0, 1, 2, 3, 4, 5, 6].map((offset) =>
			threePerWeek.wasScheduledOn(day(offset), { completedDates }),
		);

	it("owes only the completed days once the week's target is met", () => {
		expect(scheduledDays([day(0), day(2), day(4)])).toEqual([
			true,
			false,
			true,
			false,
			true,
			false,
			false,
		]);
	});

	it("marks only the week's last open days missed when it falls short", () => {
		expect(scheduledDays([day(0)])).toEqual([
			true,
			false,
			false,
			false,
			false,
			true,
			true,
		]);
	});

	it("doesn't count a later completion as open capacity", () => {
		expect(scheduledDays([day(0), day(6)])).toEqual([
			true,
			false,
			false,
			false,
			false,
			true,
			true,
		]);
	});

	it("owes nothing early in the week while the target is still reachable", () => {
		expect(scheduledDays([]).slice(0, 4)).toEqual([false, false, false, false]);
		expect(scheduledDays([]).slice(4)).toEqual([true, true, true]);
	});

	it("ignores completions from other weeks", () => {
		expect(
			threePerWeek.wasScheduledOn(day(6), {
				completedDates: [day(-1), day(-2), day(-3)],
			}),
		).toBe(true);
	});
});

describe("X-per-week frequency, weekday eligibility (canFallOn)", () => {
	it("can fall on any weekday — which X days is up to the user", () => {
		for (const weekday of [1, 2, 3, 4, 5, 6, 7] as const) {
			expect(threePerWeek.canFallOn(weekday)).toBe(true);
		}
	});
});
