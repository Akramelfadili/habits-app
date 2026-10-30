import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { surfaceColors } from "@/theme/theme";
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

	it("is a 44 pt circle with no hitSlop, so neighbouring touch areas abut and never overlap", async () => {
		await render(
			<WeekdayChip
				letter="M"
				accessibilityLabel="Monday"
				selected={false}
				onPress={jest.fn()}
			/>,
		);
		const chip = screen.getByRole("checkbox", { name: "Monday" });
		expect(StyleSheet.flatten(chip.props.style)).toMatchObject({
			width: 44,
			height: 44,
			borderRadius: 999,
		});
		expect(chip.props.hitSlop).toBeUndefined();
	});

	it("draws off as a 3:1 outline and selected as the accent fill", async () => {
		const { rerender } = await render(
			<WeekdayChip
				letter="M"
				accessibilityLabel="Monday"
				selected={false}
				onPress={jest.fn()}
			/>,
		);
		const style = () =>
			StyleSheet.flatten(
				screen.getByRole("checkbox", { name: "Monday" }).props.style,
			);
		expect(style()).toMatchObject({ borderColor: surfaceColors.light.outline });
		await rerender(
			<WeekdayChip
				letter="M"
				accessibilityLabel="Monday"
				selected
				onPress={jest.fn()}
			/>,
		);
		expect(style()).toMatchObject({
			backgroundColor: surfaceColors.light.accent,
		});
	});
});
