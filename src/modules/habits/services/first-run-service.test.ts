const mockCreateHabitsAndMarkSetting = jest.fn();

jest.mock("../repositories/habit-repository", () => ({
	createHabitsAndMarkSetting: (...args: unknown[]) =>
		mockCreateHabitsAndMarkSetting(...args),
}));

jest.mock("../repositories/category-repository", () => ({
	getCategories: async () =>
		jest.requireActual("../test-support/habit-builder")
			.TEST_BUILT_IN_CATEGORIES,
}));

import {
	type BuiltInCategoryName,
	FIRST_RUN_SUGGESTIONS,
	SEEN_FIRST_RUN_SETTING_KEY,
} from "../constants";
import { builtInCategory } from "../test-support/habit-builder";
import { addSuggestedHabits } from "./first-run-service";

describe("first-run-service", () => {
	beforeEach(() => {
		mockCreateHabitsAndMarkSetting.mockReset();
	});

	it("creates one habit input per suggestion and marks the setting atomically", async () => {
		const selected = FIRST_RUN_SUGGESTIONS.slice(0, 2);
		mockCreateHabitsAndMarkSetting.mockResolvedValue([]);

		await addSuggestedHabits(selected);

		expect(mockCreateHabitsAndMarkSetting).toHaveBeenCalledWith(
			[
				expect.objectContaining({ name: "Glass of water", direction: "build" }),
				expect.objectContaining({
					name: "Walk 20 minutes",
					direction: "build",
				}),
			],
			{ key: SEEN_FIRST_RUN_SETTING_KEY, value: "true" },
		);
	});

	it("creates what each subtitle promises — category and target included", async () => {
		mockCreateHabitsAndMarkSetting.mockResolvedValue([]);

		await addSuggestedHabits(FIRST_RUN_SUGGESTIONS);

		const [inputs] = mockCreateHabitsAndMarkSetting.mock.calls[0];
		const byName = Object.fromEntries(
			inputs.map((input: { name: string }) => [input.name, input]),
		);
		const idOf = (name: BuiltInCategoryName) => builtInCategory(name).id;
		expect(byName["Read before bed"]).toMatchObject({
			categoryId: idOf("Learning"),
			targetType: "quantity",
			targetAmount: 10,
			targetUnit: "pages",
		});
		expect(byName.Stretch).toMatchObject({
			targetType: "quantity",
			targetAmount: 5,
			targetUnit: "min",
		});
		expect(byName["Glass of water"]).toMatchObject({
			categoryId: idOf("Health"),
			targetType: "simple",
		});
		expect(byName["Three lines journal"]).toMatchObject({
			categoryId: idOf("Mindfulness"),
		});
		expect(byName["Walk 20 minutes"]).toMatchObject({
			categoryId: idOf("Fitness"),
		});
		// Every one still starts Daily (HAB-06).
		for (const input of inputs) {
			expect(input.frequency).toEqual({ type: "daily" });
		}
	});

	it("never pairs a Break habit with a quantity target (HAB-04)", () => {
		for (const suggestion of FIRST_RUN_SUGGESTIONS) {
			if (suggestion.direction === "break") {
				expect(suggestion.target).toBeNull();
			}
		}
	});
});
