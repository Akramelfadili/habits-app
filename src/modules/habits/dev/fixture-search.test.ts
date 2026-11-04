import { fixtureSearch, setFixtureSearch } from "./fixture-search";

afterEach(() => {
	setFixtureSearch("");
	Reflect.deleteProperty(globalThis, "location");
});

describe("fixtureSearch", () => {
	it("is the override when there is no page URL (the simulator)", () => {
		setFixtureSearch("?fixtures=empty");
		expect(fixtureSearch()).toBe("?fixtures=empty");
	});

	it("is the page's own query string on web", () => {
		setFixtureSearch("?fixtures=empty");
		Object.defineProperty(globalThis, "location", {
			value: { search: "?fixtures=rest-day" },
			configurable: true,
		});
		expect(fixtureSearch()).toBe("?fixtures=rest-day");
	});
});
