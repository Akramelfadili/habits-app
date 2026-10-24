import { makeHabit } from "../test-support/habit-builder";
import {
	MAX_YEARLY_INSIGHTS,
	NEVER_STUCK_MIN_MONTHS,
	STUCK_MIN_MONTHS,
	type YearlyInsight,
	yearlyInsightsFor,
} from "./yearly-insights";
import type {
	YearlyHabitRow,
	YearMonthCell,
	YearMonthKind,
} from "./yearly-summary";

/** A slot per month Jan…Dec; a number is a judged rate in %, the strings the other kinds. */
type Spec = number | "before" | "none" | "now" | "future";

function cells(specs: Spec[]): YearMonthCell[] {
	return specs.map((spec, index) => {
		const month = new Date(2026, index, 1);
		const empty = { month, completed: 0, scheduled: 0, rate: null };
		if (spec === "before") {
			return { ...empty, kind: "before-start", current: false };
		}
		if (spec === "none") return { ...empty, kind: "none", current: false };
		if (spec === "future") return { ...empty, kind: "future", current: false };
		const kind: YearMonthKind = "counted";
		return {
			month,
			kind,
			current: spec === "now",
			completed: spec === "now" ? 5 : spec,
			scheduled: spec === "now" ? 5 : 100,
			rate: spec === "now" ? 1 : spec / 100,
		};
	});
}

function row(id: number, specs: Spec[], name = `Habit ${id}`): YearlyHabitRow {
	const own = cells(specs);
	const judged = own.filter((cell) => cell.kind === "counted");
	const completed = judged.reduce((sum, cell) => sum + cell.completed, 0);
	const scheduled = judged.reduce((sum, cell) => sum + cell.scheduled, 0);
	return {
		habit: makeHabit({ id, name }),
		cells: own,
		completed,
		scheduled,
		rate: scheduled === 0 ? 0 : completed / scheduled,
	};
}

type Streak = {
	days: number;
	endedOn: Date | null;
	habit: ReturnType<typeof makeHabit> | null;
};
const NO_STREAK: Streak = { days: 0, endedOn: null, habit: null };

function insights(
	rows: YearlyHabitRow[],
	months: Spec[],
	longest: Streak = NO_STREAK,
): YearlyInsight[] {
	return yearlyInsightsFor({ months: cells(months), rows, longest });
}

const types = (list: YearlyInsight[]) => list.map((insight) => insight.type);

describe("yearlyInsightsFor — gates (HAB-17)", () => {
	it("says 'early' when no month has finished — never an empty list", () => {
		expect(insights([], ["now", "future", "future"])).toEqual([
			{ type: "early" },
		]);
	});

	it("does not judge the month still running", () => {
		expect(types(insights([row(1, [80, "now"])], [80, "now"]))).not.toContain(
			"best-month",
		);
	});

	it("says 'perfect' only when every finished month was 100%", () => {
		expect(insights([row(1, [100, 100, 100])], [100, 100, 100])).toEqual([
			{ type: "perfect" },
		]);
		expect(
			types(insights([row(1, [100, 99, 100])], [100, 99, 100])),
		).not.toEqual(["perfect"]);
	});

	it("says 'steady' when one finished month is all there is to compare", () => {
		expect(insights([row(1, [70, "now"])], [70, "now"])).toEqual([
			{ type: "steady" },
		]);
	});
});

describe("yearlyInsightsFor — stuck (85%+ for 4 months in a row)", () => {
	const run = (specs: Spec[]) =>
		types(insights([row(1, specs)], specs)).includes("stuck");

	it("needs four in a row; three is not enough", () => {
		expect(STUCK_MIN_MONTHS).toBe(4);
		expect(run([90, 90, 90, 70, 70])).toBe(false);
		expect(run([90, 90, 90, 90, 70])).toBe(true);
	});

	it("counts exactly 85% but not 84%", () => {
		expect(run([85, 85, 85, 85])).toBe(true);
		expect(run([85, 85, 85, 84])).toBe(false);
	});

	it("breaks a run at an all-frozen / rest month — it can't be one of the four", () => {
		expect(run([90, 90, "none", 90, 90])).toBe(false);
	});

	it("doesn't count before-start months, and a late starter can still qualify", () => {
		expect(run(["before", "before", 90, 90, 90, 90])).toBe(true);
		expect(run(["before", "before", 90, 90, 90, "before"])).toBe(false);
	});

	it("ignores the month in progress", () => {
		expect(run([90, 90, 90, "now"])).toBe(false);
	});

	it("names the habit with the longest run", () => {
		const list = insights(
			[
				row(1, [90, 90, 90, 90, 60], "Four"),
				row(2, [90, 90, 90, 90, 90], "Five"),
			],
			[80, 80, 80, 80, 80],
		);
		const stuck = list.find((insight) => insight.type === "stuck");
		expect(stuck?.type === "stuck" && stuck.row.habit.name).toBe("Five");
	});
});

describe("yearlyInsightsFor — never stuck (under 50% in 5 months)", () => {
	const never = (specs: Spec[]) =>
		types(insights([row(1, specs)], [80, 80, 80, 80, 80, 80, 80])).includes(
			"never-stuck",
		);

	it("needs five months under 50%, not necessarily in a row", () => {
		expect(NEVER_STUCK_MIN_MONTHS).toBe(5);
		expect(never([40, 40, 60, 40, 40, 40])).toBe(true);
		expect(never([40, 40, 60, 40, 40, 60])).toBe(false);
	});

	it("counts 49% but not exactly 50%", () => {
		expect(never([49, 49, 49, 49, 49])).toBe(true);
		expect(never([49, 49, 49, 49, 50])).toBe(false);
	});

	it("does not count before-start months toward the five", () => {
		expect(never(["before", "before", 40, 40, 40, 40])).toBe(false);
		expect(never(["before", "before", 40, 40, 40, 40, 40])).toBe(true);
	});

	it("does not count all-frozen months, nor the month in progress", () => {
		expect(never([40, 40, "none", 40, 40, "now"])).toBe(false);
		expect(never([40, 40, "none", 40, 40, 40, "now"])).toBe(true);
	});

	it("reports how many months it judged", () => {
		const list = insights(
			[row(1, [40, 40, 60, 40, 40, 40], "Mobility")],
			[80, 80, 80, 80, 80, 80],
		);
		const found = list.find((insight) => insight.type === "never-stuck");
		expect(found?.type === "never-stuck" && found.underMonths).toBe(5);
		expect(found?.type === "never-stuck" && found.judgedMonths).toBe(6);
	});
});

describe("yearlyInsightsFor — best month & seasonal dip", () => {
	it("needs two finished months to name a best one", () => {
		expect(types(insights([row(1, [70])], [70]))).not.toContain("best-month");
		expect(types(insights([row(1, [70, 90])], [70, 90]))).toContain(
			"best-month",
		);
	});

	it("names the highest month, the earliest on a tie", () => {
		const best = insights([row(1, [90, 90, 70])], [90, 90, 70])[0];
		expect(best.type === "best-month" && best.cell.month.getMonth()).toBe(0);
	});

	it("attaches the year's longest streak only when it ended in the best month", () => {
		const months: Spec[] = [70, 90];
		const inBest = insights([row(1, months)], months, {
			days: 41,
			endedOn: new Date(2026, 1, 28),
			habit: makeHabit({ id: 9, name: "Water" }),
		})[0];
		expect(inBest.type === "best-month" && inBest.streak).toEqual({
			days: 41,
			habit: makeHabit({ id: 9, name: "Water" }),
		});
		const elsewhere = insights([row(1, months)], months, {
			days: 41,
			endedOn: new Date(2026, 0, 31),
			habit: makeHabit({ id: 9, name: "Water" }),
		})[0];
		expect(elsewhere.type === "best-month" && elsewhere.streak).toBeNull();
	});

	it("finds a dip of two months at least 8 points under the best", () => {
		const months: Spec[] = [90, 91, 83, 82, 90];
		const list = insights([row(1, months)], months);
		const dip = list.find((insight) => insight.type === "seasonal");
		expect(dip?.type === "seasonal" && dip.points).toBe(8);
		expect(dip?.type === "seasonal" && dip.run).toHaveLength(2);
	});

	it("does not call one month, or a 7-point gap, a dip", () => {
		expect(types(insights([row(1, [91, 83, 91])], [91, 83, 91]))).not.toContain(
			"seasonal",
		);
		const months: Spec[] = [91, 84, 84, 91];
		expect(types(insights([row(1, months)], months))).not.toContain("seasonal");
	});
});

describe("yearlyInsightsFor — ranking & the cap", () => {
	// Best month, stuck and never-stuck all fire, and so does a dip: the dip is cut.
	const rows = [
		row(1, [90, 90, 90, 90, 70, 70, 70], "Read"),
		row(2, [40, 40, 40, 40, 40, 90, 90], "Mobility"),
	];
	const months: Spec[] = [90, 90, 90, 90, 70, 70, 70];

	it("never returns more than three, and in card order", () => {
		const list = insights(rows, months);
		expect(MAX_YEARLY_INSIGHTS).toBe(3);
		expect(types(list)).toEqual(["best-month", "stuck", "never-stuck"]);
	});

	it("keeps the dip when there is room for it", () => {
		const list = insights([rows[0]], months);
		expect(types(list)).toEqual(["best-month", "stuck", "seasonal"]);
	});

	it("only 'never stuck' carries an action target (the habit); the rest are read-only", () => {
		const list = insights(rows, months);
		const withHabit = list.filter((insight) => "row" in insight);
		expect(withHabit.map((insight) => insight.type)).toEqual([
			"stuck",
			"never-stuck",
		]);
	});
});
