import { act, renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, Habit } from "../types";

let mockHabits: Habit[] = [];
let mockEntries: Entry[] = [];
jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => ({ habits: mockHabits, loaded: true }),
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: () => mockEntries,
}));

import { useRolloverQueries } from "./use-rollover-queries";

const friday = new Date(2026, 9, 23);
const saturday = new Date(2026, 9, 24);

beforeEach(() => {
	mockHabits = [1, 2, 3, 4, 5].map((id) =>
		makeHabit({ id, createdAt: new Date(2026, 8, 1) }),
	);
	mockEntries = [1, 2, 3, 4].map(
		(habitId) =>
			({
				id: habitId,
				habitId,
				date: "2026-10-23",
				createdAt: new Date(),
			}) as Entry,
	);
});

describe("useRolloverQueries (SY5)", () => {
	it("has no notice on the first render: the starting day is not a rollover", async () => {
		const { result } = await renderHook(
			({ today }: { today: Date }) => useRolloverQueries(today),
			{ initialProps: { today: friday } },
		);
		expect(result.current.notice).toBeNull();
	});

	it("names the closed day and its tally when today moves on", async () => {
		const { result, rerender } = await renderHook(
			({ today }: { today: Date }) => useRolloverQueries(today),
			{ initialProps: { today: friday } },
		);
		await rerender({ today: saturday });
		expect(result.current.notice?.day.getDate()).toBe(23);
		expect(result.current.notice?.summary).toEqual({ completed: 4, total: 5 });
	});

	it("stays until it is dismissed, and a later day brings a new one", async () => {
		const { result, rerender } = await renderHook(
			({ today }: { today: Date }) => useRolloverQueries(today),
			{ initialProps: { today: friday } },
		);
		await rerender({ today: saturday });
		await act(() => result.current.dismiss());
		expect(result.current.notice).toBeNull();

		await rerender({ today: new Date(2026, 9, 25) });
		expect(result.current.notice?.day.getDate()).toBe(24);
	});

	it("a re-render on the same day is not a rollover", async () => {
		const { result, rerender } = await renderHook(
			({ today }: { today: Date }) => useRolloverQueries(today),
			{ initialProps: { today: friday } },
		);
		await rerender({ today: new Date(2026, 9, 23) });
		expect(result.current.notice).toBeNull();
	});
});
