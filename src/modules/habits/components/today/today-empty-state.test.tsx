import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { TodayEmptyState } from "./today-empty-state";

const dev = {
	clearAll: undefined,
	isClearingAll: false,
	seedStreakAtRisk: undefined,
	isSeedingStreakAtRisk: false,
	seedHistory: undefined,
	isSeedingHistory: false,
	resetFirstRun: undefined,
	isResetting: false,
};

describe("TodayEmptyState", () => {
	it("offers one primary action, Add habit", async () => {
		const onAddHabit = jest.fn();
		await render(
			<TodayEmptyState
				onAddHabit={onAddHabit}
				onBrowseSuggestions={jest.fn()}
				dev={dev}
			/>,
		);
		expect(screen.getByText("Nothing to track yet")).toBeTruthy();
		expect(
			screen.getByText(
				"Add a habit and it shows up here on every day it\u2019s due.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Add habit"));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
	});

	it("offers Browse suggestions, which opens the list", async () => {
		const onBrowse = jest.fn();
		await render(
			<TodayEmptyState
				onAddHabit={jest.fn()}
				onBrowseSuggestions={onBrowse}
				dev={dev}
			/>,
		);
		await fireEvent.press(screen.getByText("Browse suggestions"));
		expect(onBrowse).toHaveBeenCalledTimes(1);
	});
});
