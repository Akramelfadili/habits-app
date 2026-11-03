import { fireEvent, render, screen } from "@testing-library/react-native";
import type { SuggestionItem } from "../../presenters/suggestions-presenter";
import { SUGGESTIONS } from "../../suggestions";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

import { SuggestionRow } from "./suggestion-row";

const item = (added: boolean): SuggestionItem => ({
	suggestion: SUGGESTIONS[0],
	subtitle: "Quantity · 8 glasses a day",
	added,
	appearance: { shape: "plus", hue: 175 },
});

describe("SuggestionRow", () => {
	it("shows the name and how it repeats, and opens Add habit when tapped", async () => {
		const onPick = jest.fn();
		await render(<SuggestionRow item={item(false)} onPick={onPick} />);
		expect(screen.getByText("Drink water")).toBeTruthy();
		expect(screen.getByText("Quantity · 8 glasses a day")).toBeTruthy();
		expect(screen.queryByText("Added")).toBeNull();
		await fireEvent.press(screen.getByRole("button"));
		expect(onPick).toHaveBeenCalledTimes(1);
	});

	it("is read as one stop with what tapping does", async () => {
		await render(<SuggestionRow item={item(false)} onPick={jest.fn()} />);
		const row = screen.getByRole("button");
		expect(row.props.accessibilityLabel).toBe(
			"Drink water, Quantity · 8 glasses a day",
		);
		expect(row.props.accessibilityHint).toBe(
			"Opens Add habit with this filled in.",
		);
	});

	it("says Added, is not a control and cannot be picked", async () => {
		const onPick = jest.fn();
		await render(<SuggestionRow item={item(true)} onPick={onPick} />);
		expect(screen.getByText("Added")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
		await fireEvent.press(screen.getByText("Drink water"));
		expect(onPick).not.toHaveBeenCalled();
	});

	it("reads Added in its label, so a screen reader hears the state with the name", async () => {
		await render(<SuggestionRow item={item(true)} onPick={jest.fn()} />);
		expect(
			screen.getByLabelText("Drink water, Quantity · 8 glasses a day. Added"),
		).toBeTruthy();
	});
});
