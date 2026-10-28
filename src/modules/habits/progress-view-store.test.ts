import { act } from "@testing-library/react-native";
import { resetProgressView, useProgressViewStore } from "./progress-view-store";

const state = () => useProgressViewStore.getState();

describe("progress view store", () => {
	beforeEach(() => resetProgressView());

	it("starts on Week with no filter, no month and no ringed day", () => {
		expect(state()).toEqual(
			expect.objectContaining({
				range: "week",
				monthKey: null,
				fromYear: false,
				habitId: null,
				selectedDay: null,
			}),
		);
	});

	it("keeps the chosen range until it is changed (it lives outside the screen)", () => {
		act(() => state().setRange("year"));
		expect(state().range).toBe("year");
	});

	it("shows the current month when Month is picked from the switcher (D15)", () => {
		act(() => state().openMonthFromYear(new Date(2026, 6, 1)));
		act(() => state().setRange("month"));
		expect(state().monthKey).toBeNull();
		expect(state().fromYear).toBe(false);
	});

	it("opens a Year month label as that month, remembering to go back", () => {
		act(() => state().openMonthFromYear(new Date(2026, 6, 15)));
		expect(state()).toEqual(
			expect.objectContaining({
				range: "month",
				monthKey: "2026-07-15",
				fromYear: true,
			}),
		);
	});

	it("returns to Year from a month opened there, and forgets the month and the ringed day", () => {
		act(() => state().openMonthFromYear(new Date(2026, 6, 1)));
		act(() => state().selectDay(new Date(2026, 6, 14)));
		expect(state().selectedDay).toBe("2026-07-14");
		act(() => state().backToYear());
		expect(state()).toEqual(
			expect.objectContaining({
				range: "year",
				monthKey: null,
				fromYear: false,
				selectedDay: null,
			}),
		);
	});

	it("drops the ringed day when the range changes, and keeps the habit filter", () => {
		act(() => state().setHabit(7));
		act(() => state().selectDay(new Date(2026, 6, 14)));
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
