import { addDays } from "date-fns";
import { createDailyFrequency } from "./daily-frequency";

describe("daily frequency", () => {
	it("is due on every day of the week, regardless of completions", () => {
		const strategy = createDailyFrequency({ type: "daily" });
		const monday = new Date(2026, 8, 21);

		for (let offset = 0; offset < 7; offset++) {
			const date = addDays(monday, offset);
			expect(strategy.isDueOn(date, { completedDates: [date] })).toBe(true);
		}
	});

	it("was scheduled on every past day too", () => {
		const strategy = createDailyFrequency({ type: "daily" });
		expect(
			strategy.wasScheduledOn(new Date(2026, 8, 21), { completedDates: [] }),
		).toBe(true);
	});
});
