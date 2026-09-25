import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { IconSquare } from "./icon-square";

describe("IconSquare", () => {
	it("calls onPress when tapped (icon variant)", async () => {
		const onPress = jest.fn();
		await render(
			<IconSquare
				variant="icon"
				symbol="flame.fill"
				accent={{ tint: "#EEF", ink: "#00F" }}
				selected={false}
				onPress={onPress}
				accessibilityLabel="Flame"
			/>,
		);

		await fireEvent.press(screen.getByLabelText("Flame"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("reports selected state for the color variant", async () => {
		await render(
			<IconSquare
				variant="color"
				color="#1A1A19"
				selected
				onPress={jest.fn()}
				accessibilityLabel="Blue"
			/>,
		);

		expect(
			screen.getByLabelText("Blue").props.accessibilityState.selected,
		).toBe(true);
	});

	it("reports unselected state when not selected", async () => {
		await render(
			<IconSquare
				variant="color"
				color="#1A1A19"
				selected={false}
				onPress={jest.fn()}
				accessibilityLabel="Blue"
			/>,
		);

		expect(
			screen.getByLabelText("Blue").props.accessibilityState.selected,
		).toBe(false);
	});
});
