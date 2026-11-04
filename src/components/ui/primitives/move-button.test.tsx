import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { MoveButton } from "./move-button";

describe("MoveButton", () => {
	it("is a labelled 44 pt button that moves one step", async () => {
		const onPress = jest.fn();
		await render(
			<MoveButton
				direction="up"
				accessibilityLabel="Move Meditate up"
				onPress={onPress}
			/>,
		);
		const button = screen.getByLabelText("Move Meditate up");
		const style = StyleSheet.flatten(button.props.style);
		expect(style.width).toBeGreaterThanOrEqual(44);
		expect(style.height).toBeGreaterThanOrEqual(44);
		await fireEvent.press(button);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("does nothing and says so when there is nowhere to go", async () => {
		const onPress = jest.fn();
		await render(
			<MoveButton
				direction="down"
				accessibilityLabel="Move Meditate down"
				disabled
				onPress={onPress}
			/>,
		);
		const button = screen.getByLabelText("Move Meditate down");
		expect(button.props.accessibilityState.disabled).toBe(true);
		await fireEvent.press(button);
		expect(onPress).not.toHaveBeenCalled();
	});
});
