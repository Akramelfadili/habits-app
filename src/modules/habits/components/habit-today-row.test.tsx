import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import { HabitTodayRow } from "./habit-today-row";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

describe("HabitTodayRow", () => {
	it("renders the habit's name", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "Gym" })}
				completed={false}
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByText("Gym")).toBeTruthy();
	});

	it("tapping the name calls onPress, not onToggle", async () => {
		const onPress = jest.fn();
		const onToggle = jest.fn();
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "Gym" })}
				completed={false}
				onToggle={onToggle}
				onPress={onPress}
			/>,
		);

		await fireEvent.press(screen.getByText("Gym"));
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(onToggle).not.toHaveBeenCalled();
	});

	it("tapping the completion circle calls onToggle, not onPress", async () => {
		const onPress = jest.fn();
		const onToggle = jest.fn();
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "Gym" })}
				completed={false}
				onToggle={onToggle}
				onPress={onPress}
			/>,
		);

		await fireEvent.press(screen.getByLabelText("Gym"));
		expect(onToggle).toHaveBeenCalledTimes(1);
		expect(onPress).not.toHaveBeenCalled();
	});

	it("renders a Break habit's row identically to a Build habit's (HAB-04 not built yet)", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "No phone in bed", direction: "break" })}
				completed={false}
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(
			screen.getByLabelText("No phone in bed").props.accessibilityState,
		).toEqual({ checked: false });
	});
});
