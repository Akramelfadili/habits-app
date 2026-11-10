import { act, renderHook } from "@testing-library/react-native";
import { HABIT_FIXTURES } from "../dev/habit-fixtures";
import { makeHabitInput } from "../test-support/habit-builder";
import type * as WebHabitRepository from "./habit-repository.web";

// Jest runs as iOS, so `./habit-repository` would resolve to the SQLite one —
// require the web file explicitly, fresh per test so the in-memory store resets.
function loadRepository(): typeof WebHabitRepository {
	let repository!: typeof WebHabitRepository;
	const react = jest.requireActual("react");
	jest.isolateModules(() => {
		// Share the test renderer's React — an isolated copy has no hook dispatcher.
		jest.doMock("react", () => react);
		repository = require("./habit-repository.web");
	});
	return repository;
}

const input = makeHabitInput({
	name: "Stretch",
	categoryId: 2,
});

describe("habit-repository.web", () => {
	it("starts from the fixture habits", async () => {
		const { useHabitsList } = loadRepository();
		const { result } = await renderHook(() => useHabitsList().habits);
		expect(result.current.map((h) => h.name)).toEqual(
			HABIT_FIXTURES.map((h) => h.name),
		);
	});

	it("creates a habit with the next id and notifies live readers", async () => {
		const { createHabit, useHabitsList } = loadRepository();
		const { result } = await renderHook(() => useHabitsList().habits);

		let created: Awaited<ReturnType<typeof createHabit>> | undefined;
		await act(async () => {
			created = await createHabit(input);
		});

		expect(created?.id).toBe(HABIT_FIXTURES.length + 1);
		expect(result.current.at(-1)?.name).toBe("Stretch");
	});

	it("updates a habit but keeps its direction", async () => {
		const { updateHabit } = loadRepository();
		const updated = await updateHabit(4, { ...input, name: "No phone" });

		expect(updated.name).toBe("No phone");
		expect(updated.direction).toBe("break");
	});

	describe("lifecycle", () => {
		it("splits active and archived habits, and moves one across on archive/restore", async () => {
			const {
				setHabitArchived,
				setHabitRestored,
				useActiveHabits,
				useArchivedHabits,
			} = loadRepository();
			const active = await renderHook(() => useActiveHabits().habits);
			const archived = await renderHook(() => useArchivedHabits().habits);
			expect(archived.result.current).toEqual([]);

			await act(async () => {
				await setHabitArchived(1, new Date());
			});
			expect(active.result.current.map((h) => h.id)).not.toContain(1);
			expect(archived.result.current.map((h) => h.id)).toEqual([1]);

			const pauses = [{ from: "2026-09-01", to: "2026-09-02" }];
			await act(async () => {
				await setHabitRestored(1, pauses);
			});
			expect(archived.result.current).toEqual([]);
			expect(active.result.current.find((h) => h.id === 1)?.pauses).toEqual(
				pauses,
			);
		});

		it("reorders by swapping the habits' own sort values", async () => {
			const { reorderHabits, useHabitsList } = loadRepository();
			const { result } = await renderHook(() => useHabitsList().habits);

			await act(() => reorderHabits([2, 1]));

			expect(result.current.map((h) => h.id).slice(0, 2)).toEqual([2, 1]);
		});

		it("deletes one habit", async () => {
			const { deleteHabitAndHistory, getHabit } = loadRepository();
			await deleteHabitAndHistory(2);
			expect(await getHabit(2)).toBeUndefined();
			expect(await getHabit(1)).toBeDefined();
		});
	});
});

describe("habit-repository.web — the load states (SY1, SY2)", () => {
	function openAt(scenario: string) {
		Object.defineProperty(globalThis, "location", {
			value: { search: `?fixtures=${scenario}` },
			configurable: true,
		});
	}
	afterEach(() => Reflect.deleteProperty(globalThis, "location"));

	it("today-loading never finishes: not loaded, no habits", async () => {
		openAt("today-loading");
		const { useActiveHabits } = loadRepository();
		const { result } = await renderHook(() => useActiveHabits());
		expect(result.current).toEqual({ habits: [], loaded: false });
	});

	it("today-load-fails throws on every read, as a failing live query does", async () => {
		openAt("today-load-fails");
		const { useActiveHabits } = loadRepository();
		await expect(renderHook(() => useActiveHabits())).rejects.toThrow(
			"Simulated load failure",
		);
		await expect(renderHook(() => useActiveHabits())).rejects.toThrow(
			"Simulated load failure",
		);
	});

	it("any other scenario is untouched", async () => {
		openAt("default");
		const { useActiveHabits } = loadRepository();
		const { result } = await renderHook(() => useActiveHabits());
		expect(result.current.loaded).toBe(true);
	});
});
