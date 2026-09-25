import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
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

	it("never fills solid for a Break habit, even when resisted", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="No phone in bed"
				direction="break"
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("No phone in bed").props.style,
		);
		expect(flatStyle.backgroundColor).toBeUndefined();
		expect(flatStyle.borderWidth).toBe(2);
	});

	it("uses a dashed ring for an empty Break habit", async () => {
		await render(
			<CompletionCircle
				completed={false}
				onPress={jest.fn()}
				accessibilityLabel="No phone in bed"
				direction="break"
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("No phone in bed").props.style,
		);
		expect(flatStyle.borderStyle).toBe("dashed");
	});

	it("reports checked for a resisted Break habit", async () => {
		await render(
			<CompletionCircle
				completed
				onPress={jest.fn()}
				accessibilityLabel="No phone in bed"
				direction="break"
			/>,
		);
		expect(
			screen.getByLabelText("No phone in bed").props.accessibilityState,
		).toEqual({ checked: true });
	});
});
