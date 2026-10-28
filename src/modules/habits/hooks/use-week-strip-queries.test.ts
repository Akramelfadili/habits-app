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
			useWeekStripQueries(TODAY, TODAY),
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
			useWeekStripQueries(TODAY, TODAY),
		);
		expect(result.current.days[0].allDone).toBe(true);
		expect(result.current.days[1].allDone).toBe(false);
	});

	it("swipes back a week, and forward again but never past this week", async () => {
		const { result } = await renderHook(() =>
			useWeekStripQueries(TODAY, TODAY),
		);
		expect(result.current.canShowNext).toBe(false);
		await act(() => result.current.showNextWeek());
		expect(result.current.days[0].key).toBe("2026-10-19");

		await act(() => result.current.showPreviousWeek());
		expect(result.current.days[0].key).toBe("2026-10-12");
		expect(result.current.direction).toBe(-1);
		expect(result.current.canShowNext).toBe(true);

		await act(() => result.current.showNextWeek());
		expect(result.current.days[0].key).toBe("2026-10-19");
		expect(result.current.direction).toBe(1);
	});

	it("goes back to the selection's week when the selection changes", async () => {
		const { result, rerender } = await renderHook(
			({ selected }: { selected: Date }) =>
				useWeekStripQueries(selected, TODAY),
			{ initialProps: { selected: TODAY } },
		);
		await act(() => result.current.showPreviousWeek());
		expect(result.current.days[0].key).toBe("2026-10-12");
		await rerender({ selected: new Date(2026, 9, 21) });
		expect(result.current.days[0].key).toBe("2026-10-19");
	});
});
