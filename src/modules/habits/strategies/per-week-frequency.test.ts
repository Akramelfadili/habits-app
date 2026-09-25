import { addDays } from "date-fns";
import { createPerWeekFrequency } from "./per-week-frequency";

// 2026-09-21 is a Monday; the week runs to Sunday 2026-09-27.
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
