import { format } from "date-fns";
import { buildDayDetail } from "../domain/progress-grid";
import { progressUnlock } from "../domain/progress-unlock";
import {
	monthView,
	PROGRESS_TODAY,
	progressEntries,
	progressFrozen,
	progressHabits,
	read,
	water,
	weekView,
	yearView,
} from "../test-support/progress-views";
import {
	calendarDayLabel,
	currentBandIndex,
	dayDetailProps,
	dayListLabel,
	monthCalendarProps,
	monthNote,
	monthRateRows,
	yearBandsProps,
	yearMonthListProps,
} from "./progress-calendar-presenter";

const dot = () => "#00aa88";

function month() {
	const view = monthView();
	if (view.state !== "ready") throw new Error("expected a ready month");
	return view;
}

describe("the month calendar (P7)", () => {
	const view = month();
	const dayByDate = (n: number) => {
		const day = view.grid.days.find((d) => d.date.getDate() === n);
		if (!day) throw new Error(String(n));
		return day;
	};

	it("labels a day with its date and what happened", () => {
		expect(calendarDayLabel(dayByDate(14))).toBe(
			"Wednesday 14 October, 100 percent",
		);
		expect(calendarDayLabel(dayByDate(22))).toBe("Thursday 22 October, frozen");
		expect(calendarDayLabel(dayByDate(24))).toBe(
			"Saturday 24 October, upcoming",
		);
		expect(calendarDayLabel(dayByDate(3))).toBe(
			"Saturday 3 October, before you started",
		);
	});

	it("draws Monday-first weeks of 40 pt days that open their detail", () => {
		const onSelect = jest.fn();
		const { letters, weeks } = monthCalendarProps(
			view.grid,
			"2026-10-14",
			onSelect,
		);
		expect(letters).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
		expect(weeks.every((week) => week.length === 7)).toBe(true);
		// 1 October 2026 is a Thursday: three blank days first.
		expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
		const cells = weeks.flat().filter((cell) => cell !== null);
		expect(cells).toHaveLength(31);
		const fourteenth = cells.find((cell) => cell?.key === "2026-10-14");
		expect(fourteenth).toEqual(
			expect.objectContaining({ selected: true, text: "14" }),
		);
		fourteenth?.onPress?.();
		expect(onSelect).toHaveBeenCalledWith(dayByDate(14));
		expect(cells.find((cell) => cell?.key === "2026-10-23")?.today).toBe(true);
	});
});

describe("dayListLabel", () => {
	it("collapses runs and can name the month", () => {
		const days = [14, 15, 22].map((n) => new Date(2026, 9, n));
		expect(dayListLabel(days, false)).toBe("14–15, 22");
		expect(dayListLabel([new Date(2026, 9, 7)], true)).toBe("7 Oct");
		expect(dayListLabel([], true)).toBe("");
	});
});

describe("monthNote", () => {
	const view = month();
	const unlock = progressUnlock({ count: 40, firstDate: "2026-09-01" });

	it("names the frozen day and the days still ahead (P7)", () => {
		expect(
			monthNote(view.grid, { unlock, oneHabit: null, tooEarly: false }),
		).toBe("22 Oct frozen · 24–31 still ahead");
	});

	it("one habit: its name, the missed days and the frozen days (P10)", () => {
		expect(
			monthNote(view.grid, { unlock, oneHabit: read, tooEarly: false }),
		).toMatch(/^Read 20 min · .*frozen$/);
	});

	it("too early: when it started, and that earlier days are dashed (P9)", () => {
		const early = monthView("too-early");
		if (early.state !== "too-early") throw new Error("expected too-early");
		expect(
			monthNote(early.grid, {
				unlock: early.unlock,
				oneHabit: null,
				tooEarly: true,
			}),
		).toBe("Started Wed 21 Oct · earlier days dashed");
	});
});

describe("per-habit rates (P8)", () => {
	const view = month();
	const rows = monthRateRows(view.summary.habits, dot);

	it("ranks slipping habits last and tags Break habits", () => {
		expect(rows.map((row) => row.name)).toEqual([
			"Drink water",
			"No social media",
			"Read 20 min",
		]);
		const breaker = rows.find((row) => row.name === "No social media");
		expect(breaker?.isBreak).toBe(true);
		expect(breaker?.sub.startsWith("Resisted ")).toBe(true);
	});

	it("names frozen days and flags slipping, with an amber bar's fraction", () => {
		const reading = rows.find((row) => row.name === "Read 20 min");
		expect(reading?.sub).toBe("Daily · 9 of 10 · 1 frozen");
		expect(reading?.rate).toBe("90%");
		expect(reading?.bar).toBeCloseTo(0.9);
		expect(reading?.accessibilityLabel).toBe(
			"Read 20 min, 90%, Daily · 9 of 10 · 1 frozen",
		);
	});

	it("lists bonus logs as not counted and shows a dash without a rate", () => {
		const [first] = view.summary.habits;
		const [row] = monthRateRows(
			[{ ...first, bonus: 2, rate: null, frozen: 0, slipping: false }],
			dot,
		);
		expect(row.sub).toContain("2 bonus, not counted");
		expect(row.rate).toBe("—");
		expect(row.bar).toBe(0);
	});
});

describe("day detail (P13)", () => {
	const detail = buildDayDetail({
		habits: progressHabits,
		entries: progressEntries(),
		frozenDays: progressFrozen,
		today: PROGRESS_TODAY,
		date: new Date(2026, 9, 21),
	});

	it("titles the day and counts done against due", () => {
		const card = dayDetailProps(detail, dot);
		expect(card.title).toBe("Wednesday, 21 October");
		expect(card.summary).toBe("2 of 3 done · 67%");
		expect(card.editable).toBe(true);
		expect(card.accessibilityLabel).toBe(
			"Wednesday 21 October, 2 of 3 done · 67%",
		);
	});

	it("says each habit's state in words: Done, Resisted, Missed", () => {
		const states = Object.fromEntries(
			dayDetailProps(detail, dot).rows.map((row) => [row.name, row.state]),
		);
		expect(states).toEqual({
			"Drink water": "Done",
			"Read 20 min": "Missed",
			"No social media": "Resisted",
		});
	});

	it("shows a quantity day as 'value of target', a frozen day as Frozen", () => {
		const quantity = {
			...detail,
			items: [
				{
					habit: water,
					isBreak: false,
					status: "done" as const,
					level: 3 as const,
					value: 8,
					target: 8,
				},
				{
					habit: read,
					isBreak: false,
					status: "frozen" as const,
					level: 0 as const,
					target: null,
				},
			],
		};
		expect(dayDetailProps(quantity, dot).rows.map((row) => row.state)).toEqual([
			"8 of 8",
			"Frozen",
		]);
	});

	it("cannot be edited for a day that has not happened (no Edit this day)", () => {
		const future = buildDayDetail({
			habits: progressHabits,
			entries: [],
			frozenDays: [],
			today: PROGRESS_TODAY,
			date: new Date(2026, 9, 28),
		});
		const card = dayDetailProps(future, dot);
		expect(card.editable).toBe(false);
		expect(card.summary).toBe("Nothing was due");
	});
});

describe("the year heat map (P12)", () => {
	const view = yearView();
	if (view.state !== "ready") throw new Error("expected a ready year");
	const openMonth = jest.fn();
	const bands = yearBandsProps(view.grid, openMonth);

	it("draws three bands of four month labels, 12 in all", () => {
		expect(bands).toHaveLength(3);
		expect(bands.map((band) => band.months.length)).toEqual([4, 4, 4]);
		expect(bands[2].months.map((month) => month.label)).toEqual([
			"Sep ›",
			"Oct ›",
			"Nov ›",
			"Dec ›",
		]);
	});

	it("lays a band out in Monday-first week columns of seven", () => {
		for (const band of bands) {
			expect(band.columns.every((column) => column.length === 7)).toBe(true);
		}
		// 1 January 2026 is a Thursday: the first column starts with three blanks.
		expect(bands[0].columns[0].slice(0, 3)).toEqual([null, null, null]);
		expect(bands[0].columns[0][3]?.key).toBe("2026-01-01");
		const days = bands.flatMap((band) =>
			band.columns.flat().filter((cell) => cell !== null),
		);
		expect(days).toHaveLength(365);
	});

	it("puts each month's label over the week column its first day falls in", () => {
		const [jan, feb] = bands[0].months;
		expect(jan.column).toBe(0);
		// 1 Feb 2026 is a Sunday, in week 4 (columns 0–4 hold 29 Dec – 1 Feb).
		expect(feb.column).toBe(4);
	});

	it("opens a month from its label, and says its rate (or that there is no data)", () => {
		const october = bands[2].months[1];
		october.onPress();
		expect(openMonth).toHaveBeenCalledWith(new Date(2026, 9, 1));
		expect(october.accessibilityLabel).toMatch(
			/^October, \d+ percent\. Opens Month\.$/,
		);
		expect(bands[0].months[0].accessibilityLabel).toBe(
			"January, no data. Opens Month.",
		);
	});

	it("shows only the band holding today's month while too early (P14)", () => {
		expect(currentBandIndex(view.grid, PROGRESS_TODAY)).toBe(2);
		expect(currentBandIndex(view.grid, new Date(2026, 1, 3))).toBe(0);
	});

	it("builds the month list that VoiceOver and AX3 read: months that have started (P16)", () => {
		const list = yearMonthListProps(view.grid, openMonth);
		expect(list.map((item) => item.label)).toEqual(["October"]);
		expect(list[0]).toEqual(
			expect.objectContaining({
				percent: 97,
				accessibilityLabel: "October, 97 percent. Opens Month.",
			}),
		);
		list[0].onPress();
		expect(openMonth).toHaveBeenLastCalledWith(new Date(2026, 9, 1));
	});
});

it("fixtures: a week view exists for the same data (guards the shared fixture)", () => {
	expect(weekView().state).toBe("ready");
	expect(format(PROGRESS_TODAY, "EEE d MMM")).toBe("Fri 23 Oct");
});
