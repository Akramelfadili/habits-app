import { resetProgressView, useProgressViewStore } from "./progress-view-store";

const state = () => useProgressViewStore.getState();

// No component is mounted here, so the store is driven directly (no act).
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
		state().setRange("year");
		expect(state().range).toBe("year");
	});

	it("drops the ringed day when the range changes, and keeps the habit filter", () => {
		state().setHabit(7);
		state().selectDay(new Date(2026, 6, 14));
		expect(state().selectedDay).toBe("2026-07-14");
		state().setRange("week");
		expect(state().selectedDay).toBeNull();
		expect(state().habitId).toBe(7);
		state().setHabit(null);
		expect(state().habitId).toBeNull();
	});

	it("closes the detail card with selectDay(null)", () => {
		state().selectDay(new Date(2026, 6, 14));
		state().selectDay(null);
		expect(state().selectedDay).toBeNull();
	});
});
