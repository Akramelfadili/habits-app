import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: (props: object) => <View testID="symbol" {...props} /> };
});

import { surfaceColors } from "@/theme/theme";
import {
	HEADER_MENU_BUTTON_SIZE,
	HeaderAddButton,
	HeaderMenuButton,
} from "./header-menu-button";

describe("HeaderMenuButton", () => {
	it("is labelled 'More', collapsed at rest", async () => {
		await render(<HeaderMenuButton open={false} onPress={jest.fn()} />);
		const button = screen.getByLabelText("More");
		expect(button.props.accessibilityState).toMatchObject({ expanded: false });
		expect(button).toHaveStyle({ backgroundColor: surfaceColors.light.card });
	});

	it("inverts to ink and reports expanded when open", async () => {
		await render(<HeaderMenuButton open onPress={jest.fn()} />);
		const button = screen.getByLabelText("More");
		expect(button.props.accessibilityState).toMatchObject({ expanded: true });
		expect(button).toHaveStyle({ backgroundColor: surfaceColors.light.ink });
		expect(screen.getByTestId("symbol").props.tintColor).toBe(
			surfaceColors.light.onAccent,
		);
	});

	it("is at least a 44pt target", async () => {
		await render(<HeaderMenuButton open={false} onPress={jest.fn()} />);
		expect(HEADER_MENU_BUTTON_SIZE).toBeGreaterThanOrEqual(44);
		expect(screen.getByLabelText("More")).toHaveStyle({
			width: HEADER_MENU_BUTTON_SIZE,
			height: HEADER_MENU_BUTTON_SIZE,
		});
	});

	it("calls onPress", async () => {
		const onPress = jest.fn();
		await render(<HeaderMenuButton open={false} onPress={onPress} />);
		await fireEvent.press(screen.getByLabelText("More"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("HeaderAddButton is the same 44pt circle, labelled for what it adds, and calls onPress", async () => {
		const onPress = jest.fn();
		await render(
			<HeaderAddButton accessibilityLabel="Add habit" onPress={onPress} />,
		);
		const button = screen.getByRole("button", { name: "Add habit" });
		expect(StyleSheet.flatten(button.props.style)).toMatchObject({
			width: HEADER_MENU_BUTTON_SIZE,
			height: HEADER_MENU_BUTTON_SIZE,
		});
		await fireEvent.press(button);
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
