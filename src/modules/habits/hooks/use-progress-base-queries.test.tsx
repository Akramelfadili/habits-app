import { renderHook, waitFor } from "@testing-library/react-native";
import { entries, frozenDays, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { notifyTableChanged } from "@/lib/db/test-live-query";
import { inAct } from "@/test-support/in-act";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as BaseHook from "./use-progress-base-queries";

/** The reads every Progress range shares, on a real, migrated in-memory database. */
const mockDb = createTestDb({ onWrite: notifyTableChanged });
jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: require("@/lib/db/test-live-query").useLiveQuery,
}));

const { createHabitAt } = require("../repositories/habit-repository");
const { setHabitCompletedOn } = require("../repositories/entry-repository");
const { freezeHabitDay } = require("../repositories/frozen-day-repository");
const {
	useProgressBaseQueries,
}: typeof BaseHook = require("./use-progress-base-queries");

const NOW = new Date(2026, 8, 18, 12);

async function habit(name = "Read"): Promise<number> {
	const created = await inAct<{ id: number }>(() =>
		createHabitAt(makeHabitInput({ name }), new Date(2026, 0, 1)),
	);
	return created.id;
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

describe("useProgressBaseQueries", () => {
	it("walks the gate: no habits → nothing logged → too early → ready", async () => {
		const hook = await renderHook(() => useProgressBaseQueries(null));
		await waitFor(() => expect(hook.result.current.gate).toBe("no-habits"));

		const read = await habit();
		await waitFor(() =>
			expect(hook.result.current.gate).toBe("nothing-logged"),
		);
		expect(hook.result.current.nothingLogged).toBe(true);

		await inAct(async () => {
			for (const day of [1, 2, 3]) {
				await setHabitCompletedOn(read, new Date(2026, 8, day), true);
			}
		});
		await waitFor(() => expect(hook.result.current.gate).toBe("too-early"));
		expect(hook.result.current.unlock).toMatchObject({
			loggedDays: 3,
			remainingDays: 4,
		});

		await inAct(async () => {
			for (const day of [4, 5, 6, 7]) {
				await setHabitCompletedOn(read, new Date(2026, 8, day), true);
			}
		});
		await waitFor(() => expect(hook.result.current.gate).toBe("ready"));
		expect(hook.result.current.unlock.isUnlocked).toBe(true);
	});

	it("scopes to one habit and counts the freezes left this month", async () => {
		const read = await habit("Read");
		await habit("Stretch");
		await inAct(() => freezeHabitDay(read, new Date(2026, 8, 10), new Date()));
		const all = await renderHook(() => useProgressBaseQueries(null));
		const one = await renderHook(() => useProgressBaseQueries(read));
		await waitFor(() => expect(one.result.current.scoped).toHaveLength(1));
		expect(all.result.current.scoped).toHaveLength(2);
		expect(one.result.current.scoped[0].name).toBe("Read");
		await waitFor(() => expect(one.result.current.freezesLeft).toBe(1));
		expect(one.result.current.firstDay?.getFullYear()).toBe(2026);
	});

	it("waits for the habit list and the logged-day count before reporting loaded", async () => {
		await habit();
		const hook = await renderHook(() => useProgressBaseQueries(null));
		await waitFor(() => expect(hook.result.current.loaded).toBe(true));
	});
});
