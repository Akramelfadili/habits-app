import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { progressHabits, read } from "../../test-support/progress-views";
import { HabitFilterChip } from "./habit-filter-chip";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("HabitFilterChip (P15)", () => {
	it("reads All habits when nothing is filtered, and opens the picker", async () => {
		const onPress = jest.fn();
		await render(<HabitFilterChip habit={null} onPress={onPress} />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Show habit: All habits" }),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(screen.getByText("All habits")).toBeTruthy();
	});

	it("shows the chosen habit by name, so the current filter is always visible", async () => {
		await render(<HabitFilterChip habit={read} onPress={jest.fn()} />);
		expect(
			screen.getByRole("button", { name: "Show habit: Read 20 min" }),
		).toBeTruthy();
		expect(screen.getByText("Read 20 min")).toBeTruthy();
	});

	it("is at least 44 pt tall", async () => {
		await render(
			<HabitFilterChip habit={progressHabits[0]} onPress={jest.fn()} />,
		);
		expect(
			StyleSheet.flatten(screen.getByTestId("habit-filter-chip").props.style)
				.minHeight,
		).toBe(44);
	});
});
