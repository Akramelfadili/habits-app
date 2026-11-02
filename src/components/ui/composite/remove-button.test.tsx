import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { RemoveButton } from "./remove-button";

describe("RemoveButton", () => {
	it("is a labelled button that removes on press", async () => {
		const onPress = jest.fn();
		await render(
			<RemoveButton
				accessibilityLabel="Remove reminder at 18:30"
				onPress={onPress}
			/>,
		);
		await fireEvent.press(
			screen.getByRole("button", { name: "Remove reminder at 18:30" }),
		);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("is a 44 pt target", async () => {
		await render(
			<RemoveButton accessibilityLabel="Remove" onPress={jest.fn()} />,
		);
		const style = StyleSheet.flatten(screen.getByRole("button").props.style);
		expect(style).toMatchObject({ width: 44, height: 44 });
	});

	it("does nothing when disabled", async () => {
		const onPress = jest.fn();
		await render(
			<RemoveButton accessibilityLabel="Remove" onPress={onPress} disabled />,
		);
		await fireEvent.press(screen.getByRole("button"));
		expect(onPress).not.toHaveBeenCalled();
	});
});
