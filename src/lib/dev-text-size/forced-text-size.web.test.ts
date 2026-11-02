import { forcedAccessibilityTextSize } from "./forced-text-size.web";

function atUrl(search: string) {
	Object.defineProperty(globalThis, "location", {
		value: { search },
		writable: true,
		configurable: true,
	});
	return forcedAccessibilityTextSize();
}

describe("forcedAccessibilityTextSize (web)", () => {
	it("is false with no flag, and for any other value", () => {
		expect(atUrl("")).toBe(false);
		expect(atUrl("?fixtures=empty")).toBe(false);
		expect(atUrl("?textSize=standard")).toBe(false);
	});

	it("is true for ?textSize=ax, alongside other flags", () => {
		expect(atUrl("?textSize=ax")).toBe(true);
		expect(atUrl("?fixtures=empty&textSize=ax&theme=dark")).toBe(true);
	});
});

describe("forcedAccessibilityTextSize keeps the flag a page opened with", () => {
	it("stays on after a navigation drops the query (First Run's redirect)", () => {
		expect(atUrl("?textSize=ax")).toBe(true);
		expect(atUrl("")).toBe(true);
	});
});
