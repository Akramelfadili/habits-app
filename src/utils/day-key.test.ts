import { addDays, parseISO } from "date-fns";
import { withTimeZone } from "@/test-support/time-zone";
import { DAY_KEY_FORMAT, fromDayKey, nextDay, toDayKey } from "./day-key";

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

describe("nextDay", () => {
	it("is the next day's local midnight", () => {
		const next = nextDay(new Date(2026, 9, 24, 23, 59));
		expect(toDayKey(next)).toBe("2026-10-25");
		expect(next.getHours()).toBe(0);
	});

	// Sao Paulo's DST began at midnight on 4 Nov 2018, so that day's first
	// instant is 01:00. Bare addDays carried 01:00 onto every later day, and a
	// walk bounded by a midnight end dropped its last day.
	it("snaps back to midnight after a day whose midnight did not exist", () => {
		withTimeZone("America/Sao_Paulo", () => {
			const gapDay = fromDayKey("2018-11-04");
			expect(gapDay.getHours()).toBe(1);
			expect(addDays(gapDay, 1).getHours()).toBe(1);
			const next = nextDay(gapDay);
			expect(toDayKey(next)).toBe("2018-11-05");
			expect(next.getHours()).toBe(0);
		});
	});
});
