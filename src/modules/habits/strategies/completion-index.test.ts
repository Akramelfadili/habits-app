import {
	completedDaysInWeek,
	completionIndex,
	completionTimesInWeek,
	dayKeyTime,
	weekKey,
} from "./completion-index";

// Wed 7 Oct 2026; weeks run Monday → Sunday (WEEK_STARTS_ON).
const day = (date: number, hour = 0) => new Date(2026, 9, date, hour);

describe("completionIndex", () => {
	it("buckets completions by Monday-start week and by day", () => {
		const dates = [day(5), day(7), day(7, 9), day(11), day(12)];
		const index = completionIndex(dates);

		// 5–11 Oct is one week; 12 Oct starts the next.
		expect(completionTimesInWeek(index, day(8))).toEqual([
			day(5).getTime(),
			day(7).getTime(),
			day(7, 9).getTime(),
			day(11).getTime(),
		]);
		expect([...completedDaysInWeek(index, day(8))]).toEqual([
			day(5).getTime(),
			day(7).getTime(),
			day(11).getTime(),
		]);
		expect([...completedDaysInWeek(index, day(14))]).toEqual([
			day(12).getTime(),
		]);
		expect(index.days.has(dayKeyTime(day(7, 18)))).toBe(true);
		expect(index.days.has(dayKeyTime(day(6)))).toBe(false);
	});

	it("is empty for a week with nothing done", () => {
		const index = completionIndex([day(5)]);
		expect(completionTimesInWeek(index, day(20))).toEqual([]);
		expect(completedDaysInWeek(index, day(20)).size).toBe(0);
	});

	it("keys weeks on their Monday", () => {
		expect(weekKey(day(11))).toBe(day(5).getTime());
		expect(weekKey(day(12))).toBe(day(12).getTime());
	});

	it("reuses the index for the same array and rebuilds when it grows", () => {
		const dates = [day(5)];
		const first = completionIndex(dates);
		expect(completionIndex(dates)).toBe(first);

		dates.push(day(6));
		const grown = completionIndex(dates);
		expect(grown).not.toBe(first);
		expect(completedDaysInWeek(grown, day(6)).size).toBe(2);
	});
});
