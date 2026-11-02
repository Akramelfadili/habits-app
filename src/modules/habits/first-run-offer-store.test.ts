import { useFirstRunOfferStore } from "./first-run-offer-store";
import { makeHabit } from "./test-support/habit-builder";

describe("useFirstRunOfferStore", () => {
	beforeEach(() => useFirstRunOfferStore.getState().clear());

	it("holds nothing until a habit is offered", () => {
		expect(useFirstRunOfferStore.getState().habit).toBeNull();
	});

	it("holds the offered habit until it is answered", () => {
		const habit = makeHabit({ name: "Drink water" });
		useFirstRunOfferStore.getState().offer(habit);
		expect(useFirstRunOfferStore.getState().habit).toBe(habit);
		useFirstRunOfferStore.getState().clear();
		expect(useFirstRunOfferStore.getState().habit).toBeNull();
	});
});
