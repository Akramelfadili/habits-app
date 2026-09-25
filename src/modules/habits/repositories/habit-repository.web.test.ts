import { act, renderHook } from "@testing-library/react-native";
import { makeHabitInput } from "../test-support/habit-builder";
import { inProduction } from "../test-support/in-production";
import { HABIT_FIXTURES } from "./habit-fixtures";
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
	icon: "leaf",
	color: "green",
});

describe("habit-repository.web", () => {
	it("starts from the fixture habits", async () => {
		const { useHabitsList } = loadRepository();
		const { result } = await renderHook(() => useHabitsList());
		expect(result.current.map((h) => h.name)).toEqual(
			HABIT_FIXTURES.map((h) => h.name),
		);
	});

	it("creates a habit with the next id and notifies live readers", async () => {
		const { createHabit, useHabitsList } = loadRepository();
		const { result } = await renderHook(() => useHabitsList());

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

	it("clears every habit", async () => {
		const { deleteAllHabits, useHabitsList } = loadRepository();
		const { result } = await renderHook(() => useHabitsList());

		await act(() => deleteAllHabits());
		expect(result.current).toEqual([]);
	});

	it("refuses to clear habits outside __DEV__", async () => {
		const { deleteAllHabits, useHabitsList } = loadRepository();
		const { result } = await renderHook(() => useHabitsList());

		await inProduction(async () => {
			await expect(deleteAllHabits()).rejects.toThrow("dev-only");
		});
		expect(result.current).toHaveLength(HABIT_FIXTURES.length);
	});
});
