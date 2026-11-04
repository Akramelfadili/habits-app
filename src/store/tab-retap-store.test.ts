import { useTabRetapStore } from "./tab-retap-store";

describe("tab re-tap store", () => {
	it("counts every re-tap, for the same tab too", () => {
		const { retap } = useTabRetapStore.getState();
		const before = useTabRetapStore.getState().count;
		retap("(today)");
		retap("(today)");
		expect(useTabRetapStore.getState()).toMatchObject({
			tab: "(today)",
			count: before + 2,
		});
	});
});
