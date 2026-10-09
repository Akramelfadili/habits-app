import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockAddSuggestedHabits = jest.fn();
const mockSkipFirstRun = jest.fn();

// jest.mock's factory is hoisted above imports, so it can't reference
// FIRST_RUN_SUGGESTIONS directly — require it lazily inside the factory instead.
jest.mock("../hooks/use-first-run-queries", () => ({
	useFirstRunQueries: () => ({
		suggestions: require("../constants").FIRST_RUN_SUGGESTIONS,
		hasSeenFirstRun: false,
	}),
}));

jest.mock("../hooks/use-first-run-actions", () => ({
	useFirstRunActions: () => ({
		addSuggestedHabits: mockAddSuggestedHabits,
		isAdding: false,
		addError: null,
		skipFirstRun: mockSkipFirstRun,
		isSkipping: false,
		skipError: null,
	}),
}));

import { FIRST_RUN_SUGGESTIONS } from "../constants";
import { FirstRunScreen } from "./first-run-screen";

describe("FirstRunScreen", () => {
	beforeEach(() => {
		mockAddSuggestedHabits.mockReset();
		mockSkipFirstRun.mockReset();
	});

	it("titles the screen as a heading (A6-09)", async () => {
		await render(<FirstRunScreen />);
		expect(
			screen.getByRole("header", { name: "Pick a couple to start" }),
		).toBeTruthy();
	});

	it("pre-selects the two default suggestions and shows their count", async () => {
		await render(<FirstRunScreen />);
		expect(screen.getByText("Add 2 habits")).toBeTruthy();
	});

	it("updates the count live as rows are toggled", async () => {
		await render(<FirstRunScreen />);

		await fireEvent.press(screen.getByText("Read before bed"));
		expect(screen.getByText("Add 3 habits")).toBeTruthy();

		await fireEvent.press(screen.getByText("Glass of water"));
		expect(screen.getByText("Add 2 habits")).toBeTruthy();
	});

	it("disables the button and reads 'Add habits' when nothing is selected", async () => {
		await render(<FirstRunScreen />);

		await fireEvent.press(screen.getByText("Glass of water"));
		await fireEvent.press(screen.getByText("Walk 20 minutes"));

		expect(screen.getByText("Add habits")).toBeTruthy();
		await fireEvent.press(screen.getByText("Add habits"));
		expect(mockAddSuggestedHabits).not.toHaveBeenCalled();
	});

	it("creates the selected suggestions on 'Add N habits'", async () => {
		await render(<FirstRunScreen />);

		await fireEvent.press(screen.getByText(/^Add 2 habits$/));
		expect(mockAddSuggestedHabits).toHaveBeenCalledWith([
			FIRST_RUN_SUGGESTIONS[0],
			FIRST_RUN_SUGGESTIONS[1],
		]);
	});

	it("dismisses without creating anything on 'Start from scratch'", async () => {
		await render(<FirstRunScreen />);

		await fireEvent.press(screen.getByText("Start from scratch"));
		expect(mockSkipFirstRun).toHaveBeenCalledTimes(1);
		expect(mockAddSuggestedHabits).not.toHaveBeenCalled();
	});
});
