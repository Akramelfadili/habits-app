import { act, renderHook } from "@testing-library/react-native";
import {
	resetProgressView,
	useProgressViewStore,
} from "../progress-view-store";
import { useProgressViewActions } from "./use-progress-view-actions";
import { useProgressViewQueries } from "./use-progress-view-queries";

describe("the Progress view hooks", () => {
	beforeEach(() => resetProgressView());

	it("reads Week with no month, filter or ringed day by default", async () => {
		const { result } = await renderHook(() => useProgressViewQueries());
		expect(result.current).toEqual({
			range: "week",
			month: null,
			fromYear: false,
			habitId: null,
			selectedKey: null,
			selectedDay: null,
		});
	});

	it("follows the actions: a Year month opens Month on that month, with a way back", async () => {
		const queries = await renderHook(() => useProgressViewQueries());
		const actions = await renderHook(() => useProgressViewActions());
		await act(async () =>
			actions.result.current.openMonthFromYear(new Date(2026, 6, 1)),
		);
		expect(queries.result.current.range).toBe("month");
		expect(queries.result.current.month).toEqual(new Date(2026, 6, 1));
		expect(queries.result.current.fromYear).toBe(true);
		await act(async () =>
			actions.result.current.selectDay(new Date(2026, 6, 14)),
		);
		expect(queries.result.current.selectedDay).toEqual(new Date(2026, 6, 14));
		await act(async () => actions.result.current.backToYear());
		expect(queries.result.current.range).toBe("year");
		expect(queries.result.current.month).toBeNull();
	});

	it("keeps the range and filter across a remount (a tab switch)", async () => {
		const actions = await renderHook(() => useProgressViewActions());
		await act(async () => actions.result.current.setRange("year"));
		await act(async () => actions.result.current.setHabit(4));
		const again = await renderHook(() => useProgressViewQueries());
		expect(again.result.current.range).toBe("year");
		expect(again.result.current.habitId).toBe(4);
		expect(useProgressViewStore.getState().range).toBe("year");
	});

	it("hands out the same actions to every caller", async () => {
		const { result } = await renderHook(() => [
			useProgressViewActions(),
			useProgressViewActions(),
		]);
		expect(result.current[1].setRange).toBe(result.current[0].setRange);
	});
});
