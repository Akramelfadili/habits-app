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
		await render(<TodayEmptyState onAddHabit={onAddHabit} dev={dev} />);
		expect(screen.getByText("Nothing to track yet")).toBeTruthy();
		await fireEvent.press(screen.getByText("Add habit"));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
	});
});
