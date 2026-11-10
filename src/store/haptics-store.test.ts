import { useHapticsStore } from "./haptics-store";

describe("haptics store", () => {
	it("is on by default", () => {
		expect(useHapticsStore.getState().enabled).toBe(true);
	});
});
