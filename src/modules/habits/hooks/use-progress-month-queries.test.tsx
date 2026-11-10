import { renderHook, waitFor } from "@testing-library/react-native";
import { format } from "date-fns";
import { entries, frozenDays, habits } from "@/lib/db/schema";
import { backdateHabit, createTestDb } from "@/lib/db/test-db";
import { notifyTableChanged } from "@/lib/db/test-live-query";
import { inAct } from "@/test-support/in-act";
import type { CalendarDay } from "../domain/progress-grid";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as MonthHook from "./use-progress-month-queries";

const mockDb = createTestDb({ onWrite: notifyTableChanged });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));

const { createHabit } = require("../repositories/habit-repository");

async function createHabitAt(
	input: Parameters<typeof createHabit>[0],
	createdAt: Date,
) {
	const created = await createHabit(input);
	await backdateHabit(mockDb, created.id, createdAt);
	return created;
}
const { setHabitCompletedOn } = require("../repositories/entry-repository");
const { freezeHabitDay } = require("../repositories/frozen-day-repository");
const {
	useProgressMonthQueries,
}: typeof MonthHook = require("./use-progress-month-queries");

const NOW = new Date(2026, 8, 18, 12);
const sept = (day: number) => new Date(2026, 8, day);

async function habit(
	overrides: Parameters<typeof makeHabitInput>[0] = {},
): Promise<number> {
	const created = await inAct<{ id: number }>(() =>
		createHabitAt(makeHabitInput(overrides), new Date(2026, 0, 1)),
	);
	return created.id;
}

async function done(habitId: number, days: number[]) {
	await inAct(async () => {
		for (const day of days) await setHabitCompletedOn(habitId, sept(day), true);
	});
}

/**
 * A: daily · B: daily Break · C: Mon/Wed/Fri.
 * Sep 1: A, B (+ C as a bonus: Tuesday) → perfect · Sep 2: A, C → 2 of 3
 * Sep 4: A, B, C frozen → violet, not perfect · Sep 7: A → 1 of 3 · Sep 8–10: A.
 */
async function seedMonth() {
	const a = await habit({ name: "A" });
	const b = await habit({ name: "B", direction: "break" });
	const c = await habit({
		name: "C",
		frequency: { type: "weekdays", days: [1, 3, 5] },
	});
	await done(a, [1, 2, 4, 7, 8, 9, 10]);
	await done(b, [1, 4]);
	await done(c, [1, 2]);
	await inAct(() => freezeHabitDay(c, sept(4), new Date()));
	return { a, b, c };
}

async function ready(options = {}) {
	const hook = await renderHook(() => useProgressMonthQueries(options));
	await waitFor(() => expect(hook.result.current.state).toBe("ready"));
	const view = hook.result.current;
	if (view.state !== "ready") throw new Error("not ready");
	return { view, hook };
}

beforeEach(async () => {
	jest.useFakeTimers({
		now: NOW,
		doNotFake: [
			"nextTick",
			"setImmediate",
			"clearImmediate",
			"queueMicrotask",
			"requestAnimationFrame",
			"cancelAnimationFrame",
			"performance",
			"hrtime",
		],
	});
	await mockDb.delete(frozenDays);
	await mockDb.delete(entries);
	await mockDb.delete(habits);
});
afterEach(() => jest.useRealTimers());

const dayOf = (view: { grid: { days: CalendarDay[] } }, day: number) =>
	view.grid.days.find((d) => d.key === format(sept(day), "yyyy-MM-dd"));

describe("useProgressMonthQueries", () => {
	it("opens on the current month (D15)", async () => {
		await seedMonth();
		const { view } = await ready();
		expect(format(view.summary.window.start, "yyyy-MM-dd")).toBe("2026-09-01");
	});

	it("shades each day by done ÷ due: L3 perfect, L2 from half, L1 under half, L0 none", async () => {
		await seedMonth();
		const { view } = await ready();
		expect(dayOf(view, 1)).toMatchObject({
			level: 3,
			perfect: true,
		});
		expect(dayOf(view, 2)).toMatchObject({
			level: 2,
			notch: true,
			perfect: false,
		});
		expect(dayOf(view, 7)).toMatchObject({ level: 1, notch: true });
		expect(dayOf(view, 5)).toMatchObject({ level: 0, status: "missed" });
	});

	it("a bonus log (C on a Tuesday) changes neither the day's level nor the rate", async () => {
		await seedMonth();
		const { view } = await ready();
		// Sep 1: A and B are due and done; C's Tuesday log is a bonus.
		expect(dayOf(view, 1)).toMatchObject({ done: 2, due: 2 });
		expect(view.summary.bonus.map((b) => [b.habit.name, b.date])).toEqual([
			["C", "2026-09-01"],
		]);
	});

	it("shows a frozen day as frozen, outside the rate, and never as perfect", async () => {
		await seedMonth();
		const { view } = await ready();
		expect(dayOf(view, 4)).toMatchObject({
			status: "frozen",
			perfect: false,
			done: 2,
			due: 2,
			frozen: 1,
		});
		expect(view.summary.freezes.map((f) => f.date)).toEqual(["2026-09-04"]);
		const c = view.summary.habits.find((r) => r.habit.name === "C");
		expect(c).toMatchObject({ frozen: 1 });
	});

	it("counts the Break habit's resisted days as done", async () => {
		await seedMonth();
		const { view } = await ready();
		const b = view.summary.habits.find((r) => r.habit.name === "B");
		expect(b).toMatchObject({ isBreak: true, done: 2 });
	});

	it("agrees with itself: the calendar's days add up to the stats", async () => {
		await seedMonth();
		const { view } = await ready();
		const done = view.grid.days.reduce((sum, d) => sum + d.done, 0);
		const due = view.grid.days.reduce((sum, d) => sum + d.due, 0);
		expect(view.summary).toMatchObject({ done, due });
		expect(view.summary.perfectDays).toBe(
			view.grid.days.filter((d) => d.perfect).length,
		);
	});

	it("counts the freezes left this month from the shared pool", async () => {
		await seedMonth();
		const { view } = await ready();
		expect(view.freezesLeft).toBe(1);
	});

	it("opens another month by parameter and follows a change of month", async () => {
		await seedMonth();
		const { hook } = await ready();
		await hook.rerender({});
		const august = await renderHook(
			(props: { month: Date }) => useProgressMonthQueries(props),
			{ initialProps: { month: new Date(2026, 7, 10) } },
		);
		await waitFor(() => expect(august.result.current.state).toBe("ready"));
		const view = august.result.current;
		if (view.state !== "ready") throw new Error("state");
		expect(format(view.summary.window.start, "yyyy-MM-dd")).toBe("2026-08-01");
		// The habits existed in August but nothing was logged then: every due day is missed.
		expect(view.summary.done).toBe(0);
		await august.rerender({ month: new Date(2026, 8, 3) });
		await waitFor(() => {
			const next = august.result.current;
			expect(next.state === "ready" && next.summary.done).toBeGreaterThan(0);
		});
	});

	it("is binary for one habit and the stats switch to it", async () => {
		const { b } = await seedMonth();
		const { view } = await ready({ habitId: b });
		const levels = new Set(
			view.grid.days.filter((d) => d.level !== null).map((d) => d.level),
		);
		expect([...levels].sort()).toEqual([0, 3]);
		expect(view.summary.habits).toHaveLength(1);
		expect(view.summary).toMatchObject({ done: 2 });
	});

	it("stays too early under 7 logged days but still draws the calendar", async () => {
		const a = await habit({ name: "A" });
		await done(a, [1, 2, 3]);
		const hook = await renderHook(() => useProgressMonthQueries());
		await waitFor(() => expect(hook.result.current.state).toBe("too-early"));
		const view = hook.result.current;
		if (view.state !== "too-early") throw new Error("state");
		expect(view.unlock).toMatchObject({ loggedDays: 3, remainingDays: 4 });
		expect(view.grid.days).toHaveLength(30);
		expect(dayOf(view, 5)).toMatchObject({ status: "missed" });
	});

	it("reads outlined days when nothing was ever logged, and nothing at all with no habits", async () => {
		const empty = await renderHook(() => useProgressMonthQueries());
		await waitFor(() => expect(empty.result.current.state).toBe("no-habits"));
		await habit({ name: "A" });
		await waitFor(() =>
			expect(empty.result.current.state).toBe("nothing-logged"),
		);
		const view = empty.result.current;
		if (view.state !== "nothing-logged") throw new Error("state");
		expect(dayOf(view, 5)?.status).toBe("nothing-logged");
	});
});
