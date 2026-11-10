import { format, subDays } from "date-fns";
import { todayV3Entries, todayV3Habits } from "./today-v3-fixtures";

describe("today fixtures", () => {
	it("gives the main Today habits, one per row", () => {
		expect(todayV3Habits("today-v3").map((habit) => habit.name)).toEqual([
			"Drink water",
			"Cold shower",
			"Meditate",
			"Read 20 min",
			"No social media",
			"Upper body",
		]);
	});

	it("leaves Meditate undone yesterday only in the at-risk scenario", () => {
		const yesterday = (scenario: Parameters<typeof todayV3Entries>[0]) =>
			todayV3Entries(scenario).some(
				(entry) =>
					entry.habitId === 3 &&
					entry.date === format(subDays(new Date(), 1), "yyyy-MM-dd"),
			);
		expect(yesterday("today-v3")).toBe(true);
		expect(yesterday("today-v3-at-risk")).toBe(false);
	});

	it("has no daily habit on the rest day", () => {
		expect(
			todayV3Habits("today-v3-rest").every(
				(habit) => habit.frequency.type !== "daily",
			),
		).toBe(true);
	});
});
