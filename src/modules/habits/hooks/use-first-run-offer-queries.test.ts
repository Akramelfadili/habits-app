import { act, renderHook } from "@testing-library/react-native";
import { useFirstRunOfferStore } from "../first-run-offer-store";
import { makeHabit } from "../test-support/habit-builder";
import { useFirstRunOfferQueries } from "./use-first-run-offer-queries";

describe("useFirstRunOfferQueries", () => {
	beforeEach(() => useFirstRunOfferStore.getState().clear());

	it("follows the store: null, then the offered habit", async () => {
		const { result } = await renderHook(() => useFirstRunOfferQueries());
		expect(result.current.habit).toBeNull();

		const habit = makeHabit({ name: "Read 20 min" });
		await act(() => useFirstRunOfferStore.getState().offer(habit));
		expect(result.current.habit).toBe(habit);
	});
});
