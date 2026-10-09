import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { WeekdayChip } from "./weekday-chip";

describe("WeekdayChip", () => {
	it("shows its letter, is labelled by the full day name, and reports selection", async () => {
		await render(
			<WeekdayChip
				letter="M"
				accessibilityLabel="Monday"
				selected
				onPress={jest.fn()}
			/>,
		);

		expect(screen.getByText("M")).toBeTruthy();
		expect(screen.getByLabelText("Monday").props.accessibilityState).toEqual({
			checked: true,
			disabled: false,
		});
		expect(screen.getByRole("checkbox", { name: "Monday" })).toBeTruthy();
	});

	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(
			<WeekdayChip
				letter="S"
				accessibilityLabel="Sunday"
				selected={false}
				onPress={onPress}
			/>,
		);

		await fireEvent.press(screen.getByLabelText("Sunday"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("blocks onPress when disabled", async () => {
		const onPress = jest.fn();
		await render(
			<WeekdayChip
				letter="S"
				accessibilityLabel="Sunday"
				selected={false}
				onPress={onPress}
				disabled
			/>,
		);

		await fireEvent.press(screen.getByLabelText("Sunday"));
		expect(onPress).not.toHaveBeenCalled();
	});

	it("owns an equal 44pt-tall column, so neighbouring chips' touch areas abut and never overlap", async () => {
		await render(
			<WeekdayChip
				letter="M"
				accessibilityLabel="Monday"
				selected={false}
				onPress={jest.fn()}
			/>,
		);
		const chip = screen.getByRole("checkbox", { name: "Monday" });
		const style = StyleSheet.flatten(chip.props.style);
		expect(style.minHeight).toBe(44);
		expect(style.flex).toBe(1);
		expect(chip.props.hitSlop).toBeUndefined();
	});
});
