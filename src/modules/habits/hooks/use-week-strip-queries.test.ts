import { act, renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";

const mockHabits = [makeHabit({ id: 1, createdAt: new Date(2026, 8, 1) })];
let mockEntries: Entry[] = [];
jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => ({ habits: mockHabits, loaded: true }),
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: () => mockEntries,
}));

import { useWeekStripQueries } from "./use-week-strip-queries";

const TODAY = new Date(2026, 9, 23, 10);

describe("useWeekStripQueries", () => {
	beforeEach(() => {
		mockEntries = [];
	});

	it("shows the selected day's week, Monday first", async () => {
		const { result } = await renderHook(() =>
			useWeekStripQueries(TODAY, TODAY, jest.fn()),
		);
		expect(result.current.days.map((day) => day.key)[0]).toBe("2026-10-19");
		expect(result.current.days.at(-1)?.key).toBe("2026-10-25");
	});

	it("dots a day when everything due was done", async () => {
		mockEntries = [
			{
				id: 1,
				habitId: 1,
				date: "2026-10-19",
				createdAt: new Date(2026, 9, 19),
			},
		];
		const { result } = await renderHook(() =>
			useWeekStripQueries(TODAY, TODAY, jest.fn()),
		);
		expect(result.current.days[0].allDone).toBe(true);
		expect(result.current.days[1].allDone).toBe(false);
	});

	it("a swipe selects the same weekday a week away, so the shown week holds the selection", async () => {
		const onSelect = jest.fn();
		const { result } = await renderHook(() =>
			useWeekStripQueries(TODAY, TODAY, onSelect),
		);
		expect(result.current.canShowNext).toBe(false);
		await act(() => result.current.showNextWeek());
		expect(onSelect).not.toHaveBeenCalled();

		await act(() => result.current.showPreviousWeek());
		expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 16, 10));
	});

	it("never selects past today when swiping forward from a past week", async () => {
		const onSelect = jest.fn();
		const { result } = await renderHook(() =>
			useWeekStripQueries(new Date(2026, 9, 17), TODAY, onSelect),
		);
		expect(result.current.canShowNext).toBe(true);
		await act(() => result.current.showNextWeek());
		expect(onSelect).toHaveBeenCalledWith(TODAY);
	});

	it("always shows the selection's week, with nothing to reset when it changes", async () => {
		const { result, rerender } = await renderHook(
			({ selected }: { selected: Date }) =>
				useWeekStripQueries(selected, TODAY, jest.fn()),
			{ initialProps: { selected: TODAY } },
		);
		await rerender({ selected: new Date(2026, 9, 14) });
		expect(result.current.days[0].key).toBe("2026-10-12");
		await rerender({ selected: TODAY });
		expect(result.current.days[0].key).toBe("2026-10-19");
	});
});
