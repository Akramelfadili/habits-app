import { act, renderHook } from "@testing-library/react-native";

const mockEnable = jest.fn();
jest.mock("../services/first-run-service", () => ({
	enableFirstHabitReminder: (...args: unknown[]) => mockEnable(...args),
}));

import { useFirstRunOfferStore } from "../first-run-offer-store";
import { makeHabit } from "../test-support/habit-builder";
import { useFirstRunOfferActions } from "./use-first-run-offer-actions";

describe("useFirstRunOfferActions", () => {
	beforeEach(() => {
		mockEnable.mockReset();
		useFirstRunOfferStore.getState().offer(makeHabit());
	});

	it("allow runs the service for that habit and resolves with the permission", async () => {
		mockEnable.mockResolvedValue("granted");
		const habit = makeHabit({ name: "Meditate" });
		const { result } = await renderHook(() => useFirstRunOfferActions());

		let outcome: unknown;
		await act(async () => {
			outcome = await result.current.allow(habit);
		});

		expect(mockEnable).toHaveBeenCalledWith(habit);
		expect(outcome).toEqual({ ok: true, value: "granted" });
	});

	it("notNow only clears the offer: nothing is scheduled and iOS is not asked", async () => {
		const { result } = await renderHook(() => useFirstRunOfferActions());

		await act(() => result.current.notNow());

		expect(mockEnable).not.toHaveBeenCalled();
		expect(useFirstRunOfferStore.getState().habit).toBeNull();
	});
});
