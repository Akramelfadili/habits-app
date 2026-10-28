import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { CountButton } from "./count-button";

describe("CountButton", () => {
	it("shows the count and presses", async () => {
		const onPress = jest.fn();
		await render(
			<CountButton
				label="5/8"
				onPress={onPress}
				accessibilityLabel="Drink water, 5 of 8 glasses"
			/>,
		);
		await fireEvent.press(screen.getByText("5/8"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("is a 28 pt pill inside a hit area of at least 44 pt", async () => {
		await render(
			<CountButton
				label="5/8"
				onPress={jest.fn()}
				accessibilityLabel="Drink water, 5 of 8 glasses"
			/>,
		);
		const hit = StyleSheet.flatten(
			screen.getByLabelText("Drink water, 5 of 8 glasses").props.style,
		);
		expect([hit.minWidth, hit.minHeight]).toEqual([44, 44]);
		const pill = StyleSheet.flatten(
			screen.getByText("5/8").parent?.props.style,
		);
		expect(pill.height).toBe(28);
	});

	it("carries its accessibility label and hint", async () => {
		await render(
			<CountButton
				label="5/8"
				onPress={jest.fn()}
				accessibilityLabel="Drink water, 5 of 8 glasses"
				accessibilityHint="Opens the amount sheet."
			/>,
		);
		const button = screen.getByRole("button", {
			name: "Drink water, 5 of 8 glasses",
		});
		expect(button.props.accessibilityHint).toBe("Opens the amount sheet.");
	});
});
