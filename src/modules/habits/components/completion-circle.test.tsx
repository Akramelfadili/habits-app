import { fireEvent, render, screen } from "@testing-library/react-native";
import { CompletionCircle } from "./completion-circle";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("CompletionCircle", () => {
	it("reports checked via accessibility when completed", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
			/>,
		);
		expect(
			screen.getByLabelText("Glass of water").props.accessibilityState,
		).toEqual({ checked: true });
	});

	it("reports unchecked via accessibility when not completed", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="Glass of water"
			/>,
		);
		expect(
			screen.getByLabelText("Glass of water").props.accessibilityState,
		).toEqual({ checked: false });
	});

	it("calls onPress when tapped, regardless of state", async () => {
		const onPress = jest.fn();
		await render(
			<CompletionCircle
				completed={false}
				onPress={onPress}
				accessibilityLabel="Glass of water"
			/>,
		);
		await fireEvent.press(screen.getByLabelText("Glass of water"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
