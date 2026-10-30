import { act, renderHook } from "@testing-library/react-native";
import {
	resetProgressView,
	useProgressViewStore,
} from "../progress-view-store";
import { useProgressViewActions } from "./use-progress-view-actions";

describe("useProgressViewActions", () => {
	beforeEach(() => resetProgressView());

	it("changes the range", async () => {
		const { result } = await renderHook(() => useProgressViewActions());
		await act(async () => result.current.setRange("month"));
		expect(useProgressViewStore.getState().range).toBe("month");
	});

	it("sets and clears the habit filter, and rings and releases a day", async () => {
		const { result } = await renderHook(() => useProgressViewActions());
		await act(async () => result.current.setHabit(3));
		expect(useProgressViewStore.getState().habitId).toBe(3);
		await act(async () => result.current.setHabit(null));
		expect(useProgressViewStore.getState().habitId).toBeNull();
		await act(async () => result.current.selectDay(new Date(2026, 6, 14)));
		expect(useProgressViewStore.getState().selectedDay).toBe("2026-07-14");
		await act(async () => result.current.selectDay(null));
		expect(useProgressViewStore.getState().selectedDay).toBeNull();
	});

	it("hands out the same actions to every caller", async () => {
		const { result } = await renderHook(() => [
			useProgressViewActions(),
			useProgressViewActions(),
		]);
		expect(result.current[1].setRange).toBe(result.current[0].setRange);
	});
});
