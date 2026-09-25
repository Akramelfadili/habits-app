import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(
			<Checkbox
				checked={false}
				onPress={onPress}
				accessibilityLabel="Glass of water"
			/>,
		);

		await fireEvent.press(screen.getByLabelText("Glass of water"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("reports checked state", async () => {
		await render(
			<Checkbox
				checked
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
			/>,
		);

		expect(
			screen.getByLabelText("Glass of water").props.accessibilityState.checked,
		).toBe(true);
	});

	it("reports unchecked state", async () => {
		await render(
			<Checkbox
				checked={false}
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
			/>,
		);

		expect(
			screen.getByLabelText("Glass of water").props.accessibilityState.checked,
		).toBe(false);
	});
});
