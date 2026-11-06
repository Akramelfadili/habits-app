import { renderHook, waitFor } from "@testing-library/react-native";
import { addDays, format } from "date-fns";
import { entries, frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { notifyTableChanged } from "@/lib/db/test-live-query";
import { inAct } from "@/test-support/in-act";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as WeekHook from "./use-progress-week-queries";

/**
 * Progress · Week through the real hooks and a real, migrated in-memory
 * database: what lands in the tables is what the matrix and the stats show.
 */
const mockDb = createTestDb({ onWrite: notifyTableChanged });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));

const { createHabitAt } = require("../repositories/habit-repository");
const {
	setHabitCompletedOn,
	setHabitQuantityOn,
} = require("../repositories/entry-repository");
const { freezeHabitDay } = require("../repositories/frozen-day-repository");
const {
	useProgressWeekQueries,
}: typeof WeekHook = require("./use-progress-week-queries");

// Friday 18 Sep 2026: the week is Mon 14 – Sun 20, the one before Mon 7 – Sun 13.
const NOW = new Date(2026, 8, 18, 12);
const MONDAY = new Date(2026, 8, 14);
const at = (offset: number) => addDays(MONDAY, offset);

async function habit(
	overrides: Parameters<typeof makeHabitInput>[0] = {},
): Promise<number> {
	const created = await inAct<{ id: number }>(() =>
		createHabitAt(makeHabitInput(overrides), new Date(2026, 0, 1)),
	);
	return created.id;
}

async function done(habitId: number, offsets: number[]) {
	await inAct(async () => {
		for (const offset of offsets) {
			await setHabitCompletedOn(habitId, at(offset), true);
		}
	});
}

async function seedWeek() {
	const water = await habit({ name: "Water" });
	const upper = await habit({
		name: "Upper body",
		frequency: { type: "weekdays", days: [2, 4] },
	});
	const cold = await habit({
		name: "Cold shower",
		frequency: { type: "per-week", timesPerWeek: 3 },
	});
	const noSocial = await habit({ name: "No social media", direction: "break" });
	const read = await habit({ name: "Read" });
	await done(water, [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4]);
	await done(upper, [0, 1, 3]); // Monday is a bonus
	await done(cold, [0, 2]);
	await done(noSocial, [-7, -6, -5, -4, -3, -2, -1, 0, 1, 3]);
	await done(read, [-7, -6, -5, -4, -3, -2, -1, 0, 1]);
	await inAct(() => freezeHabitDay(read, at(3), new Date()));
	return { water, upper, cold, noSocial, read };
}

async function ready(options = {}) {
	const hook = await renderHook(() => useProgressWeekQueries(options));
	await waitFor(() => expect(hook.result.current.state).toBe("ready"));
	const view = hook.result.current;
	if (view.state !== "ready") throw new Error("not ready");
	return view;
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

describe("useProgressWeekQueries", () => {
	it("rates done ÷ due: a frozen day is excluded, a bonus log is not counted, a resisted Break day is done", async () => {
		await seedWeek();
		const { summary } = await ready();
		// water 5/5, upper 2/2 (Mon is a bonus), cold 2/2, no-social 3/4 (Wed slipped), read 2/3 (Thu frozen).
		expect(summary).toMatchObject({ done: 14, due: 16, rate: 88 });
		expect(summary.freezes.map((f) => f.date)).toEqual(["2026-09-17"]);
		expect(summary.bonus.map((b) => [b.habit.name, b.date])).toEqual([
			["Upper body", "2026-09-14"],
		]);
		const noSocial = summary.habits.find(
			(r) => r.habit.name === "No social media",
		);
		expect(noSocial).toMatchObject({ isBreak: true, done: 3, due: 4 });
	});

	it("gives +N points on last week from the same function", async () => {
		await seedWeek();
		const { summary } = await ready();
		// Last week: water, no-social and read 7/7 each; upper body missed Tue and Thu and the
		// × per week habit its whole target (the finished week's last 3 days): 21 of 26 → 81 %.
		expect(summary.previousRate).toBe(81);
		expect(summary.deltaPoints).toBe(7);
	});

	it("draws the matrix with a status per cell and row totals", async () => {
		await seedWeek();
		const { grid } = await ready();
		const row = (name: string) => grid.rows.find((r) => r.habit.name === name);
		expect(row("Upper body")?.cells.map((c) => c.status)).toEqual([
			"bonus",
			"done",
			"not-due",
			"done",
			"not-due", // Friday isn't a Tuesday or a Thursday
			"future",
			"future",
		]);
		expect(
			row("Read")
				?.cells.map((c) => c.status)
				.slice(0, 5),
		).toEqual(["done", "done", "missed", "frozen", "today"]);
		expect(row("Cold shower")).toMatchObject({ done: 2, target: 3 });
		expect(row("Water")).toMatchObject({ done: 5, target: 7 });
	});

	it("shows quantity habits below target as partial, level 1 under half and 2 from half", async () => {
		const glasses = await habit({
			name: "Glasses",
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		await inAct(async () => {
			await setHabitQuantityOn(glasses, at(0), 3);
			await setHabitQuantityOn(glasses, at(1), 5);
			await setHabitQuantityOn(glasses, at(2), 8);
		});
		const hook = await renderHook(() => useProgressWeekQueries());
		await waitFor(() => expect(hook.result.current.state).not.toBe("loading"));
		const view = hook.result.current;
		if (view.state === "loading" || view.state === "no-habits")
			throw new Error("state");
		const cells = view.grid.rows[0].cells;
		expect(cells.slice(0, 3).map((c) => [c.status, c.level])).toEqual([
			["partial", 1],
			["partial", 2],
			["done", 3],
		]);
	});

	it("reads outlined 'nothing logged yet' cells, not missed, when habits exist but nothing was ever logged", async () => {
		await habit({ name: "Water" });
		const hook = await renderHook(() => useProgressWeekQueries());
		await waitFor(() =>
			expect(hook.result.current.state).toBe("nothing-logged"),
		);
		const view = hook.result.current;
		if (view.state !== "nothing-logged") throw new Error("state");
		expect(view.grid.rows[0].cells.map((c) => c.status).slice(0, 5)).toEqual([
			"nothing-logged",
			"nothing-logged",
			"nothing-logged",
			"nothing-logged",
			"today",
		]);
		expect(view.unlock).toMatchObject({ loggedDays: 0, remainingDays: 7 });
	});

	it("the same grid reads missed once something has been logged", async () => {
		const water = await habit({ name: "Water" });
		await done(water, [0]);
		const hook = await renderHook(() => useProgressWeekQueries());
		await waitFor(() => expect(hook.result.current.state).toBe("too-early"));
		const view = hook.result.current;
		if (view.state !== "too-early") throw new Error("state");
		expect(view.grid.rows[0].cells.map((c) => c.status).slice(0, 3)).toEqual([
			"done",
			"missed",
			"missed",
		]);
		expect(view.unlock).toMatchObject({ loggedDays: 1, remainingDays: 6 });
		expect("summary" in view).toBe(false);
	});

	it("dashes the days before the first log while too early (P2)", async () => {
		const water = await habit({ name: "Water" });
		await done(water, [2, 3]);
		const hook = await renderHook(() => useProgressWeekQueries());
		await waitFor(() => expect(hook.result.current.state).toBe("too-early"));
		const view = hook.result.current;
		if (view.state !== "too-early") throw new Error("state");
		expect(view.grid.rows[0].cells.map((c) => c.status).slice(0, 5)).toEqual([
			"before-start",
			"before-start",
			"done",
			"done",
			"today",
		]);
	});

	it("is empty with no habits", async () => {
		const hook = await renderHook(() => useProgressWeekQueries());
		await waitFor(() => expect(hook.result.current.state).toBe("no-habits"));
	});

	it("builds the one-habit variant: the stats switch to that habit", async () => {
		const { noSocial } = await seedWeek();
		const { summary, grid } = await ready({ habitId: noSocial });
		expect(grid.rows).toHaveLength(1);
		expect(summary).toMatchObject({ done: 3, due: 4, rate: 75 });
		expect(summary.bestStreak).toMatchObject({ habit: { id: noSocial } });
	});

	it("reads the streak as it stands, past the week", async () => {
		const { water } = await seedWeek();
		const { summary } = await ready({ habitId: water });
		// Daily since last Monday: Mon 7 … Fri 18, 12 days.
		expect(summary.bestStreak).toMatchObject({ days: 12 });
	});

	it("opens the week of another date and re-queries", async () => {
		await seedWeek();
		const hook = await renderHook(
			(props: { anchor: Date }) => useProgressWeekQueries(props),
			{ initialProps: { anchor: at(0) } },
		);
		await waitFor(() => expect(hook.result.current.state).toBe("ready"));
		await hook.rerender({ anchor: at(-7) });
		await waitFor(() => {
			const view = hook.result.current;
			expect(view.state === "ready" && view.summary.rate).toBe(81);
		});
		const view = hook.result.current;
		if (view.state !== "ready") throw new Error("state");
		expect(format(view.summary.window.start, "yyyy-MM-dd")).toBe("2026-09-07");
	});

	it("follows a write: logging a missed day updates the stats", async () => {
		const { read } = await seedWeek();
		const hook = await renderHook(() => useProgressWeekQueries());
		await waitFor(() => expect(hook.result.current.state).toBe("ready"));
		await done(read, [2]);
		await waitFor(() => {
			const view = hook.result.current;
			expect(view.state === "ready" && view.summary.done).toBe(15);
		});
	});

	it("offers Change frequency on a slipping habit and ranks it first", async () => {
		const read = await habit({ name: "Read" });
		const water = await habit({ name: "Water" });
		await done(read, [-7, -6, -5, -4, -3, -2, -1, 0]);
		await done(water, [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4]);
		const { insights, summary } = await ready();
		expect(summary.habits.at(-1)?.habit.name).toBe("Read");
		expect(insights[0]).toMatchObject({
			kind: "slipping",
			tone: "warning",
			action: { type: "edit-habit", habitId: read, focus: "frequency" },
		});
	});
});
