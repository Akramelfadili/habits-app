import { renderHook, waitFor } from "@testing-library/react-native";
import { addDays, format } from "date-fns";
import { entries, frozenDays, habits } from "@/lib/db/schema";
import { backdateHabit, createTestDb } from "@/lib/db/test-db";
import { notifyTableChanged } from "@/lib/db/test-live-query";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as YearHook from "./use-progress-year-queries";

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
	useProgressYearQueries,
}: typeof YearHook = require("./use-progress-year-queries");

const NOW = new Date(2026, 8, 18, 12);
const key = (month: number, day: number) =>
	format(new Date(2026, month, day), "yyyy-MM-dd");

async function habit(
	overrides: Parameters<typeof makeHabitInput>[0] = {},
): Promise<number> {
	const created = await createHabitAt(
		makeHabitInput(overrides),
		new Date(2026, 0, 1),
	);
	return created.id;
}

async function doneBetween(habitId: number, from: Date, to: Date) {
	for (let day = from; day <= to; day = addDays(day, 1)) {
		await setHabitCompletedOn(habitId, day, true);
	}
}

/** A (daily) and B (daily Break) all of July and August; A alone on 1–10 Sep. B's 3 Aug is frozen, not done. */
async function seedYear() {
	const a = await habit({ name: "A" });
	const b = await habit({ name: "B", direction: "break" });
	await doneBetween(a, new Date(2026, 6, 1), new Date(2026, 7, 31));
	await doneBetween(b, new Date(2026, 6, 1), new Date(2026, 7, 2));
	await doneBetween(b, new Date(2026, 7, 4), new Date(2026, 7, 31));
	await freezeHabitDay(b, new Date(2026, 7, 3), new Date());
	await doneBetween(a, new Date(2026, 8, 1), new Date(2026, 8, 10));
	return { a, b };
}

async function ready(options = {}) {
	const hook = await renderHook(() => useProgressYearQueries(options));
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

describe("useProgressYearQueries", () => {
	it("gives a level 0–3 for every day of the current year", async () => {
		await seedYear();
		const view = await ready();
		const day = (k: string) => view.grid.days.find((d) => d.key === k);
		expect(view.grid.days).toHaveLength(365);
		expect(day(key(6, 15))).toMatchObject({ level: 3, perfect: true });
		expect(day(key(8, 3))).toMatchObject({ level: 2, notch: true });
		expect(day(key(8, 15))).toMatchObject({ level: 0, status: "missed" });
		expect(day(key(10, 1))?.status).toBe("future");
	});

	it("shows a freeze as frozen and leaves it out of the rate", async () => {
		await seedYear();
		const view = await ready();
		expect(view.grid.days.find((d) => d.key === key(7, 3))).toMatchObject({
			status: "frozen",
			perfect: false,
			done: 1,
			due: 1,
		});
		expect(view.summary.freezes).toHaveLength(1);
	});

	it("adds up: the months' done and due are the summary's", async () => {
		await seedYear();
		const view = await ready();
		const done = view.grid.months.reduce((sum, m) => sum + m.completed, 0);
		const due = view.grid.months.reduce((sum, m) => sum + m.scheduled, 0);
		expect(view.summary).toMatchObject({ done, due });
	});

	it("tiles the months, names the best one and lists them with whole-number %", async () => {
		await seedYear();
		const view = await ready();
		const [jan, , , , , , jul] = view.grid.months;
		expect(jan).toMatchObject({ kind: "counted", percent: 0 });
		expect(jul).toMatchObject({ key: "2026-07", percent: 100 });
		expect(view.grid.bestMonth?.key).toBe("2026-07");
		expect(view.grid.bands.map((band) => band.length)).toEqual([4, 4, 4]);
		const julyItem = view.grid.monthList.find((m) => m.key === "2026-07");
		expect(julyItem).toMatchObject({ percent: 100, bar: 1 });
		// Only months that have started are listed (Jan … the running Sep).
		expect(view.grid.monthList).toHaveLength(9);
		expect(view.grid.monthList.at(-1)).toMatchObject({ key: "2026-09" });
	});

	it("adds a best-month card (year-scale insights have three months of history)", async () => {
		await seedYear();
		const view = await ready();
		expect(view.insights.map((i) => i.kind)).toContain("improved");
		expect(
			view.insights.find(
				(i) => i.kind === "improved" && i.reason === "best-month",
			),
		).toMatchObject({ percent: 100, action: null });
	});

	it("is binary for one habit and the stats switch to it", async () => {
		const { b } = await seedYear();
		const view = await ready({ habitId: b });
		const levels = new Set(
			view.grid.days.filter((d) => d.level !== null).map((d) => d.level),
		);
		expect([...levels].sort()).toEqual([0, 3]);
		expect(view.summary.habits).toHaveLength(1);
		expect(view.summary.habits[0].habit.id).toBe(b);
	});

	it("opens another year by parameter", async () => {
		await seedYear();
		const hook = await renderHook(() => useProgressYearQueries({ year: 2025 }));
		await waitFor(() => expect(hook.result.current.state).toBe("ready"));
		const view = hook.result.current;
		if (view.state !== "ready") throw new Error("state");
		expect(view.grid.days).toHaveLength(365);
		expect(view.grid.days[0].key).toBe("2025-01-01");
		expect(view.grid.months.every((m) => m.kind === "before-start")).toBe(true);
		expect(view.summary).toMatchObject({ due: 0, rate: null });
		expect(view.insights).toEqual([]);
	});

	it("is too early under 7 logged days, with the grid and the days remaining", async () => {
		const a = await habit({ name: "A" });
		await doneBetween(a, new Date(2026, 8, 1), new Date(2026, 8, 3));
		const hook = await renderHook(() => useProgressYearQueries());
		await waitFor(() => expect(hook.result.current.state).toBe("too-early"));
		const view = hook.result.current;
		if (view.state !== "too-early") throw new Error("state");
		expect(view.unlock).toMatchObject({ loggedDays: 3, remainingDays: 4 });
		expect(view.grid.days).toHaveLength(365);
	});
});
