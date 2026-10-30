import { act } from "@testing-library/react-native";
import { resetProgressView, useProgressViewStore } from "./progress-view-store";

const state = () => useProgressViewStore.getState();

describe("progress view store", () => {
	beforeEach(() => resetProgressView());

	it("starts on Week with no filter and no ringed day", () => {
		expect(state()).toEqual(
			expect.objectContaining({
				range: "week",
				habitId: null,
				selectedDay: null,
			}),
		);
	});

	it("keeps the chosen range until it is changed (it lives outside the screen)", () => {
		act(() => state().setRange("year"));
		expect(state().range).toBe("year");
	});

	it("drops the ringed day when the range changes, and keeps the habit filter", () => {
		act(() => state().setHabit(7));
		act(() => state().selectDay(new Date(2026, 6, 14)));
		expect(state().selectedDay).toBe("2026-07-14");
		act(() => state().setRange("week"));
		expect(state().selectedDay).toBeNull();
		expect(state().habitId).toBe(7);
		act(() => state().setHabit(null));
		expect(state().habitId).toBeNull();
	});

	it("closes the detail card with selectDay(null)", () => {
		act(() => state().selectDay(new Date(2026, 6, 14)));
		act(() => state().selectDay(null));
		expect(state().selectedDay).toBeNull();
	});
});
