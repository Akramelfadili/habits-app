import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { surfaceColors } from "@/theme/theme";

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

	it("has a 44pt touch box around its 24pt square — a layout-neutral margin, not a hitSlop that could steal a neighbour's taps", async () => {
		await render(
			<Checkbox
				checked={false}
				onPress={jest.fn()}
				accessibilityLabel="Read"
			/>,
		);
		const box = screen.getByLabelText("Read");
		expect(StyleSheet.flatten(box.props.style)).toMatchObject({
			width: 44,
			height: 44,
			margin: -10,
		});
		expect(box.props.hitSlop).toBeUndefined();
	});

	it("draws its unchecked outline in the 3:1 outline token, not the hairline border", async () => {
		await render(
			<Checkbox
				checked={false}
				onPress={jest.fn()}
				accessibilityLabel="Read"
			/>,
		);
		const [circle] = screen.getByLabelText("Read").children;
		expect(
			StyleSheet.flatten(
				(circle as unknown as { props: { style: object } }).props.style,
			),
		).toMatchObject({
			borderColor: surfaceColors.light.outline,
		});
	});

	it("is a rounded square by the radius rule (a circle is a habit done)", async () => {
		await render(
			<Checkbox checked onPress={jest.fn()} accessibilityLabel="Read" />,
		);
		const [box] = screen.getByLabelText("Read").children;
		expect(
			StyleSheet.flatten(
				(box as unknown as { props: { style: object } }).props.style,
			),
		).toMatchObject({ width: 24, height: 24, borderRadius: 8 });
	});
});
