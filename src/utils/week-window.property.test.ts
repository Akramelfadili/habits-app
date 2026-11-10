import fc from "fast-check";
import { TEST_ZONES, withTimeZone } from "@/test-support/time-zone";
import { nextDay, toDayKey } from "./day-key";
import { weekWindow } from "./week-window";

/**
 * Property tests: the week window is Monday to Sunday, seven days, for any
 * instant, in every zone of the date matrix (a DST change inside the week must
 * not make it 6 or 8 days long).
 */

const DAY_MS = 86_400_000;

/** Weekday of a "yyyy-MM-dd" key, 0 = Sunday, read in UTC so the zone cannot move it. */
const weekdayOf = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay();
const daysBetween = (from: string, to: string) =>
	(Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

const instantArb = fc.integer({ min: 0, max: Date.UTC(2100, 11, 31) });

describe.each(TEST_ZONES)("weekWindow in %s", (zone) => {
	it("is seven days, Monday to Sunday, and contains the date", () => {
		withTimeZone(zone, () => {
			fc.assert(
				fc.property(instantArb, (ms) => {
					const date = new Date(ms);
					const { start, end } = weekWindow(date);
					const [startKey, endKey, dateKey] = [start, end, date].map(toDayKey);
					return (
						weekdayOf(startKey) === 1 &&
						weekdayOf(endKey) === 0 &&
						daysBetween(startKey, endKey) === 6 &&
						startKey <= dateKey &&
						dateKey <= endKey
					);
				}),
				{ numRuns: 200 },
			);
		});
	});

	it("walking it a day at a time visits exactly seven days", () => {
		withTimeZone(zone, () => {
			fc.assert(
				fc.property(instantArb, (ms) => {
					const { start, end } = weekWindow(new Date(ms));
					const keys: string[] = [];
					for (
						let day = start;
						toDayKey(day) <= toDayKey(end) && keys.length < 10;
						day = nextDay(day)
					) {
						keys.push(toDayKey(day));
					}
					return (
						keys.length === 7 &&
						keys.every((key, index) => daysBetween(keys[0], key) === index)
					);
				}),
				{ numRuns: 200 },
			);
		});
	});
});
