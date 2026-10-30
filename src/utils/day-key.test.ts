import { addDays, parseISO } from "date-fns";
import { DAY_KEY_FORMAT, fromDayKey, toDayKey } from "./day-key";

describe("day keys", () => {
	it("uses the stored calendar-day format", () => {
		expect(DAY_KEY_FORMAT).toBe("yyyy-MM-dd");
	});

	it("keys a date by its local calendar day, whatever the time", () => {
		expect(toDayKey(new Date(2026, 9, 24, 0, 0))).toBe("2026-10-24");
		expect(toDayKey(new Date(2026, 9, 24, 23, 59, 59))).toBe("2026-10-24");
		expect(toDayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
	});

	it("reads a key back as local midnight", () => {
		const day = fromDayKey("2026-03-29");
		expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([
			2026, 2, 29,
		]);
		expect([day.getHours(), day.getMinutes()]).toEqual([0, 0]);
	});

	it("round-trips", () => {
		expect(toDayKey(fromDayKey("2024-02-29"))).toBe("2024-02-29");
	});
});

describe("fromDayKey — the fast path", () => {
	it("gives local midnight, the same as parseISO, for every day of a leap year", () => {
		for (
			let day = new Date(2024, 0, 1);
			day.getFullYear() === 2024;
			day = addDays(day, 1)
		) {
			const key = toDayKey(day);
			expect(fromDayKey(key).getTime()).toBe(parseISO(key).getTime());
		}
	});

	it("does not roll an impossible date into the next month", () => {
		expect(Number.isNaN(fromDayKey("2026-02-31").getTime())).toBe(true);
		expect(Number.isNaN(fromDayKey("2026-13-01").getTime())).toBe(true);
	});

	it("falls back to parseISO for anything that is not yyyy-MM-dd", () => {
		expect(fromDayKey("2026-10-24T09:00:00").getHours()).toBe(9);
	});
});
