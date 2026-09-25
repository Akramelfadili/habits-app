import { fireEvent, render, screen } from "@testing-library/react-native";
import { Chip } from "./chip";

describe("Chip", () => {
	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(<Chip label="Daily" onPress={onPress} />);

		await fireEvent.press(screen.getByText("Daily"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("exposes the selected state", async () => {
		await render(<Chip label="Daily" onPress={jest.fn()} selected />);
		expect(
			screen.getByText("Daily").parent?.props.accessibilityState.selected,
		).toBe(true);
	});

	it("renders the outline variant as an unselected, pressable chip", async () => {
		const onPress = jest.fn();
		await render(
			<Chip label="Weekdays shortcut" variant="outline" onPress={onPress} />,
		);

		await fireEvent.press(screen.getByText("Weekdays shortcut"));
		expect(onPress).toHaveBeenCalled();
		expect(
			screen.getByText("Weekdays shortcut").parent?.props.accessibilityState
				.selected,
		).toBe(false);
	});

	it("blocks onPress when disabled", async () => {
		const onPress = jest.fn();
		await render(<Chip label="X per week" onPress={onPress} disabled />);

		await fireEvent.press(screen.getByText("X per week"));
		expect(onPress).not.toHaveBeenCalled();
	});
});
