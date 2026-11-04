import { buildDeviceState } from "./device-state";
import { setFixtureSearch } from "./fixture-search";

afterEach(() => setFixtureSearch(""));

describe("buildDeviceState", () => {
	it("an unknown scenario is the default one, as on web", () => {
		const state = buildDeviceState("?fixtures=nope");
		expect(state.scenario).toBe("default");
		expect(state.habits.length).toBeGreaterThan(0);
	});

	it("first-run has no habits and has not been seen", () => {
		const state = buildDeviceState("?fixtures=first-run");
		expect(state.scenario).toBe("first-run");
		expect(state.habits).toEqual([]);
		expect(state.settings["habits.seenFirstRun"]).toBeUndefined();
	});

	it("other scenarios have seen First Run; ?theme= seeds Appearance", () => {
		const state = buildDeviceState("?fixtures=default&theme=dark");
		expect(state.settings["habits.seenFirstRun"]).toBe("true");
		expect(state.settings["app.themePreference"]).toBe("dark");
	});

	it("?longNames=1 reaches the fixtures without a page URL", () => {
		const state = buildDeviceState("?fixtures=habits-v3&longNames=1");
		expect(state.habits[0].name).toHaveLength(40);
	});

	it("every habit's category is in the category list, ids are unique", () => {
		for (const scenario of ["default", "many-categories", "habit-detail"]) {
			const state = buildDeviceState(`?fixtures=${scenario}`);
			const ids = new Set(state.categories.map((c) => c.id));
			expect(ids.size).toBe(state.categories.length);
			for (const habit of state.habits) {
				expect(ids.has(habit.category.id)).toBe(true);
			}
		}
	});
});
