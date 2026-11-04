import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Chip } from "./chip";

describe("Chip", () => {
	it("draws a check when selected, so selection is not colour alone (08.7)", async () => {
		await render(<Chip label="Mon" selected onPress={() => {}} />);
		expect(screen.getByTestId("chip-check")).toBeTruthy();
	});

	it("draws none when not selected", async () => {
		await render(<Chip label="Mon" onPress={() => {}} />);
		expect(screen.queryByTestId("chip-check")).toBeNull();
	});

	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(<Chip label="Daily" onPress={onPress} />);

		await fireEvent.press(screen.getByText("Daily"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("exposes the selected state", async () => {
		await render(<Chip label="Daily" onPress={jest.fn()} selected />);
		expect(
			screen.getByRole("button", { name: "Daily" }).props.accessibilityState
				.selected,
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
			screen.getByRole("button", { name: "Weekdays shortcut" }).props
				.accessibilityState.selected,
		).toBe(false);
	});

	it("blocks onPress when disabled", async () => {
		const onPress = jest.fn();
		await render(<Chip label="X per week" onPress={onPress} disabled />);

		await fireEvent.press(screen.getByText("X per week"));
		expect(onPress).not.toHaveBeenCalled();
	});

	it("has a 44pt-tall touch area and no hitSlop (chips wrap next to each other)", async () => {
		await render(<Chip label="Daily" onPress={jest.fn()} />);
		const button = screen.getByRole("button", { name: "Daily" });
		expect(StyleSheet.flatten(button.props.style).minHeight).toBe(44);
		expect(button.props.hitSlop).toBeUndefined();
	});
});
