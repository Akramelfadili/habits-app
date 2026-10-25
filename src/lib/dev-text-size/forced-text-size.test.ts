import { forcedAccessibilityTextSize } from "./forced-text-size";

describe("forcedAccessibilityTextSize (native)", () => {
	it("is always false — the device setting decides", () => {
		expect(forcedAccessibilityTextSize()).toBe(false);
	});
});
