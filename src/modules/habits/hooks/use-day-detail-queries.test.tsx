import { renderHook, waitFor } from "@testing-library/react-native";
import { addDays } from "date-fns";
import { entries, frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { notifyTableChanged } from "@/lib/db/test-live-query";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as DayDetailHook from "./use-day-detail-queries";

/** The Month day card through the real hooks and a real, migrated in-memory database. */
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
	useDayDetailQueries,
}: typeof DayDetailHook = require("./use-day-detail-queries");

// Thursday 17 Sep 2026.
const NOW = new Date(2026, 8, 17, 12);
const TUESDAY = new Date(2026, 8, 15);

async function habit(
	overrides: Parameters<typeof makeHabitInput>[0] = {},
): Promise<number> {
	const created = await createHabitAt(
		makeHabitInput(overrides),
		new Date(2026, 0, 1),
	);
	return created.id;
}

async function loaded(date: Date | null, habitId: number | null = null) {
	const hook = await renderHook(() => useDayDetailQueries(date, habitId));
	await waitFor(() => expect(hook.result.current.loaded).toBe(true));
	const view = hook.result.current;
	if (!view.loaded) throw new Error("not loaded");
	return view.detail;
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

describe("useDayDetailQueries", () => {
	it("lists each habit's state on the date, with amounts, and headlines done ÷ due", async () => {
		const water = await habit({
			name: "Water",
			targetType: "quantity",
			targetAmount: 8,
		});
		const upper = await habit({
			name: "Upper body",
			frequency: { type: "weekdays", days: [2, 4] },
		});
		const noSocial = await habit({
			name: "No social media",
			direction: "break",
		});
		await habit({ name: "Read" });
		const stretch = await habit({ name: "Stretch" });
		await setHabitQuantityOn(water, TUESDAY, 8);
		await setHabitCompletedOn(upper, TUESDAY, true);
		await setHabitCompletedOn(noSocial, TUESDAY, true);
		await freezeHabitDay(stretch, TUESDAY, new Date());
		const detail = await loaded(TUESDAY);
		expect(detail.items.map((i) => [i.habit.name, i.status])).toEqual([
			["Water", "done"],
			["Upper body", "done"],
			["No social media", "done"],
			["Read", "missed"],
			["Stretch", "frozen"],
		]);
		expect(detail.items[0]).toMatchObject({ value: 8, target: 8 });
		expect(detail.items[2].isBreak).toBe(true);
		// Frozen is excluded: 3 of 4 due.
		expect(detail).toMatchObject({
			done: 3,
			due: 4,
			percent: 75,
			editable: true,
		});
	});

	it("shows a bonus log and a partial quantity day", async () => {
		const upper = await habit({
			name: "Upper body",
			frequency: { type: "weekdays", days: [2, 4] },
		});
		const water = await habit({
			name: "Water",
			targetType: "quantity",
			targetAmount: 8,
		});
		const monday = addDays(TUESDAY, -1);
		await setHabitCompletedOn(upper, monday, true);
		await setHabitQuantityOn(water, monday, 3);
		const detail = await loaded(monday);
		expect(detail.items.map((i) => [i.habit.name, i.status])).toEqual([
			["Upper body", "bonus"],
			["Water", "partial"],
		]);
		expect(detail.items[1]).toMatchObject({ level: 1, value: 3 });
		expect(detail).toMatchObject({ done: 0, due: 1, percent: 0 });
	});

	it("reads today when no date is given, and a future date is not editable", async () => {
		await habit({ name: "Read" });
		const today = await loaded(null);
		expect(today).toMatchObject({ isToday: true, editable: true });
		expect(today.items[0].status).toBe("today");
		const ahead = await loaded(addDays(NOW, 2));
		expect(ahead).toMatchObject({ editable: false, items: [], percent: null });
	});

	it("scopes to one habit", async () => {
		await habit({ name: "Read" });
		const stretch = await habit({ name: "Stretch" });
		const detail = await loaded(TUESDAY, stretch);
		expect(detail.items.map((i) => i.habit.name)).toEqual(["Stretch"]);
	});
});
