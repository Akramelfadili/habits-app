import { act, renderHook, waitFor } from "@testing-library/react-native";
import { eq, getTableName, is, sql } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { useEffect, useState } from "react";
import { categories, habits } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { builtInCategory, makeHabitInput } from "../test-support/habit-builder";
import type * as HabitRepository from "./habit-repository";

/**
 * Reactivity of the habit live hooks. Real `useLiveQuery` needs expo-sqlite's
 * change listener, which doesn't run under Jest — so this stand-in keeps the
 * real hook's contract: `data` starts empty and `updatedAt` undefined until
 * the first result, and a query re-runs only when *its own `from` table*
 * changes. Tables in `mockHeld` don't deliver until `release()`, so a test
 * can make habits arrive before categories (or the reverse).
 */
const mockDb = createTestDb();
const mockListeners = new Set<(table: string) => void>();
const mockHeld = new Set<string>();
const mockPending = new Map<string, (() => void)[]>();

function notifyTableChanged(table: string) {
	for (const listener of mockListeners) listener(table);
}

function release(table: string) {
	mockHeld.delete(table);
	for (const deliver of mockPending.get(table) ?? []) deliver();
	mockPending.delete(table);
}

jest.doMock("@/lib/db/client", () => ({ db: mockDb }));
jest.doMock("drizzle-orm/expo-sqlite", () => ({
	useLiveQuery: (
		query: PromiseLike<unknown[]> & { config: { table: unknown } },
	) => {
		const [result, setResult] = useState<{
			data: unknown[];
			updatedAt: Date | undefined;
		}>({ data: [], updatedAt: undefined });
		// Subscribes once, like the real hook's default `deps = []`.
		// biome-ignore lint/correctness/useExhaustiveDependencies: mirrors useLiveQuery's run-once subscription
		useEffect(() => {
			const table = query.config.table;
			const name = is(table, SQLiteTable) ? getTableName(table) : "";
			const run = () => {
				query.then((data) => {
					const deliver = () => setResult({ data, updatedAt: new Date() });
					if (mockHeld.has(name)) {
						mockPending.set(name, [...(mockPending.get(name) ?? []), deliver]);
					} else {
						deliver();
					}
				});
			};
			const listener = (changed: string) => {
				if (changed === name) run();
			};
			run();
			mockListeners.add(listener);
			return () => {
				mockListeners.delete(listener);
			};
		}, []);
		return result;
	},
}));

const { createHabit, getHabit, useActiveHabits }: typeof HabitRepository =
	require("./habit-repository");

/** Lets every resolved query promise settle (they're async, not timers). */
async function flush() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

describe("habit live hooks", () => {
	beforeEach(async () => {
		mockHeld.clear();
		mockPending.clear();
		await mockDb.delete(habits);
	});

	it("re-render with a category's new name when only the categories table changes", async () => {
		const health = builtInCategory("Health");
		await createHabit(makeHabitInput({ name: "Water", categoryId: health.id }));

		const { result } = await renderHook(() => useActiveHabits().habits);
		await waitFor(() =>
			expect(result.current[0]?.category.name).toBe("Health"),
		);

		// A rename (HAB-25) writes `categories` only — `habits` never changes.
		await mockDb
			.update(categories)
			.set({ name: "Wellbeing" })
			.where(eq(categories.id, health.id));
		await act(async () => notifyTableChanged("categories"));

		await waitFor(() =>
			expect(result.current[0]?.category.name).toBe("Wellbeing"),
		);
		await mockDb
			.update(categories)
			.set({ name: "Health" })
			.where(eq(categories.id, health.id));
	});

	it("an empty database is loaded, not still loading", async () => {
		const { result } = await renderHook(() => useActiveHabits());
		await waitFor(() => expect(result.current.loaded).toBe(true));
		expect(result.current.habits).toEqual([]);
	});

	it.each([
		["habits before categories", "categories"],
		["categories before habits", "habits"],
	])(
		"report nothing — not a partial list — until both queries return (%s)",
		async (_order, late) => {
			await createHabit(makeHabitInput({ name: "Water" }));
			await createHabit(makeHabitInput({ name: "Stretch" }));
			mockHeld.add(late);

			const { result } = await renderHook(() => useActiveHabits());
			await flush();
			expect(result.current).toEqual({ habits: [], loaded: false });

			await act(async () => release(late));
			await waitFor(() => expect(result.current.loaded).toBe(true));
			await waitFor(() =>
				expect(result.current.habits.map((habit) => habit.name)).toEqual([
					"Water",
					"Stretch",
				]),
			);
		},
	);

	it("show a habit with an unknown category under Other instead of dropping it", async () => {
		// A dangling id can only exist with foreign keys unenforced — expo-sqlite's default.
		await mockDb.run(sql`PRAGMA foreign_keys = OFF`);
		const dangling = await mockDb
			.insert(habits)
			.values({
				name: "Orphan",
				categoryId: 999,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();
		await mockDb.run(sql`PRAGMA foreign_keys = ON`);
		await createHabit(makeHabitInput({ name: "Water" }));

		const { result } = await renderHook(() => useActiveHabits().habits);
		await waitFor(() => expect(result.current).toHaveLength(2));

		const other = builtInCategory("Other");
		expect(result.current[0]).toMatchObject({
			name: "Orphan",
			category: other,
		});
		// One-off reads fall back the same way.
		expect((await getHabit(dangling[0].id))?.category).toEqual(other);
	});
});
