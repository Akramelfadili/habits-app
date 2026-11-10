import fc from "fast-check";
import { TEST_ZONES, withTimeZone } from "@/test-support/time-zone";
import { fromDayKey, nextDay, toDayKey } from "./day-key";

const FIRST_DAY_MS = Date.UTC(1970, 0, 1);
const LAST_DAY_MS = Date.UTC(2100, 11, 31);
const DAY_MS = 86_400_000;
const DAY_COUNT = (LAST_DAY_MS - FIRST_DAY_MS) / DAY_MS + 1;

// Built from UTC so it never depends on the zone under test.
const dayKeyArb = fc
	.integer({ min: 0, max: DAY_COUNT - 1 })
	.map((n) => new Date(FIRST_DAY_MS + n * DAY_MS).toISOString().slice(0, 10));

describe.each(TEST_ZONES)("day keys in %s", (zone) => {
	it("toDayKey(fromDayKey(k)) === k for every valid date from 1970 to 2100", () => {
		withTimeZone(zone, () => {
			fc.assert(
				fc.property(dayKeyArb, (key) => toDayKey(fromDayKey(key)) === key),
				{ numRuns: 200 },
			);
		});
	});

	it("fromDayKey is a local midnight of that calendar day", () => {
		withTimeZone(zone, () => {
			fc.assert(
				fc.property(dayKeyArb, (key) => {
					const day = fromDayKey(key);
					const [year, month, date] = key.split("-").map(Number);
					// A zone whose DST starts at midnight has 01:00 as that day's first hour.
					return (
						day.getFullYear() === year &&
						day.getMonth() === month - 1 &&
						day.getDate() === date &&
						day.getHours() <= 1 &&
						day.getMinutes() === 0
					);
				}),
				{ numRuns: 200 },
			);
		});
	});

	it("nextDay moves the key forward by exactly one calendar day", () => {
		withTimeZone(zone, () => {
			fc.assert(
				fc.property(dayKeyArb, (key) => {
					const following = new Date(Date.parse(`${key}T00:00:00Z`) + DAY_MS)
						.toISOString()
						.slice(0, 10);
					return toDayKey(nextDay(fromDayKey(key))) === following;
				}),
				{ numRuns: 200 },
			);
		});
	});
});
