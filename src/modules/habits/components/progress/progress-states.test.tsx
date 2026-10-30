import { fireEvent, render, screen } from "@testing-library/react-native";
import { ProgressNoHabits, ProgressNothingLogged } from "./progress-states";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("ProgressNoHabits (P3)", () => {
	it("says why it is empty and offers one next step", async () => {
		const onAddHabit = jest.fn();
		await render(<ProgressNoHabits onAddHabit={onAddHabit} />);
		expect(screen.getByRole("header", { name: "No habits yet" })).toBeTruthy();
		expect(
			screen.getByText(
				"Progress fills in once you add a habit and tick it on Today.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Add habit"));
		expect(onAddHabit).toHaveBeenCalledTimes(1);
	});
});

describe("ProgressNothingLogged (P4)", () => {
	it("names the range and links to Today", async () => {
		const onGoToToday = jest.fn();
		await render(
			<ProgressNothingLogged range="week" onGoToToday={onGoToToday} />,
		);
		expect(
			screen.getByText(
				"Tick a habit on Today and this week starts filling in.",
			),
		).toBeTruthy();
		await fireEvent.press(screen.getByText("Go to Today"));
		expect(onGoToToday).toHaveBeenCalledTimes(1);
	});
});
