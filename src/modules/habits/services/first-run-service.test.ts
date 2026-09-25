const mockCreateHabitsAndMarkSetting = jest.fn();

jest.mock("../repositories/habit-repository", () => ({
	createHabitsAndMarkSetting: (...args: unknown[]) =>
		mockCreateHabitsAndMarkSetting(...args),
}));

import {
	FIRST_RUN_SUGGESTIONS,
	SEEN_FIRST_RUN_SETTING_KEY,
} from "../constants";
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
});
