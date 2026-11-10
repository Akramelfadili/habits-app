import { addDays, eachDayOfInterval, endOfWeek, format } from "date-fns";
import { toDayKey } from "./day-key";
import {
	WEEK_STARTS_ON,
	weekAlignedSpan,
	weekLastDay,
	weekStart,
	weekWindow,
} from "./week-window";

const label = (date: Date) => format(date, "EEE yyyy-MM-dd HH:mm");

describe("weekWindow", () => {
	it("is Monday 00:00 → Sunday 00:00, both days inclusive", () => {
		const { start, end } = weekWindow(new Date(2026, 8, 20, 22));
		expect(label(start)).toBe("Mon 2026-09-14 00:00");
		expect(label(end)).toBe("Sun 2026-09-20 00:00");
	});

	it("puts a Monday in its own week, not the previous one", () => {
		expect(toDayKey(weekStart(new Date(2026, 8, 14, 0, 0)))).toBe("2026-09-14");
	});

	it("puts a Sunday 23:59 in the week that ends that day", () => {
		const { start, end } = weekWindow(new Date(2026, 8, 20, 23, 59));
		expect(toDayKey(start)).toBe("2026-09-14");
		expect(toDayKey(end)).toBe("2026-09-20");
	});

	it("starts weeks on Monday", () => {
		expect(WEEK_STARTS_ON).toBe(1);
	});

	it.each([
		["2026-03-08", "2026-03-02"],
		["2026-03-29", "2026-03-23"],
		["2026-04-05", "2026-03-30"],
		["2026-09-27", "2026-09-21"],
		["2026-10-25", "2026-10-19"],
		["2026-11-01", "2026-10-26"],
	])("covers seven days in the DST week of %s", (sunday, monday) => {
		const [y, m, d] = sunday.split("-").map(Number);
		const { start, end } = weekWindow(new Date(y, m - 1, d, 12));
		expect(toDayKey(start)).toBe(monday);
		expect(toDayKey(end)).toBe(sunday);
		const days = eachDayOfInterval({ start, end }).map(toDayKey);
		expect(days).toHaveLength(7);
		expect(new Set(days).size).toBe(7);
		expect(toDayKey(addDays(end, 1))).toBe(
			toDayKey(weekStart(addDays(end, 1))),
		);
	});
});

describe("end-bound convention", () => {
	// Every range is read by day key with an inclusive `lte`, so a bare `endOfWeek` (23:59:59.999)
	// and `startOfDay(endOfWeek)` (00:00) must name the same Sunday, DST week or not.
	it.each([
		new Date(2026, 2, 26, 12),
		new Date(2026, 9, 22, 12),
		new Date(2026, 10, 1, 12),
		new Date(2026, 3, 5, 12),
		new Date(2026, 8, 14, 0),
	])("names the same last day as bare endOfWeek for %s", (date) => {
		expect(toDayKey(weekLastDay(date))).toBe(
			toDayKey(endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })),
		);
	});
});

describe("weekAlignedSpan", () => {
	it("widens a range to the whole weeks it touches", () => {
		const span = weekAlignedSpan(new Date(2026, 8, 1), new Date(2026, 8, 30));
		expect(label(span.start)).toBe("Mon 2026-08-31 00:00");
		expect(label(span.end)).toBe("Sun 2026-10-04 00:00");
	});

	it("leaves a range that is already Monday → Sunday alone", () => {
		const span = weekAlignedSpan(new Date(2026, 8, 14), new Date(2026, 8, 20));
		expect(toDayKey(span.start)).toBe("2026-09-14");
		expect(toDayKey(span.end)).toBe("2026-09-20");
	});
});
