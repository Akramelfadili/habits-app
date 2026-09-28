import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { semanticColors } from "@/theme/theme";
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

	it("renders a Break habit's row without a resistance caption before it's resisted", async () => {
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
		expect(screen.queryByText(/resisted/i)).toBeNull();
	});

	it("shows resistance-framed copy for a resisted Break habit", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "No phone in bed", direction: "break" })}
				completed
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByText("No phone in bed — resisted")).toBeTruthy();
	});

	it("never shows a resistance caption for a completed Build habit", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "Gym", direction: "build" })}
				completed
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.queryByText(/resisted/i)).toBeNull();
	});

	it("gives a resisted Break habit completion copy built from its own name", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "No phone in bed", direction: "break" })}
				completed
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByText("No phone in bed — resisted")).toBeTruthy();
	});

	it("gives a different resisted Break habit different completion copy, not a generic string", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "Junk food", direction: "break" })}
				completed
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByText("Junk food — resisted")).toBeTruthy();
	});

	it("announces a completed Build habit as done, not just checked", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "Gym", direction: "build" })}
				completed
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("Gym, done")).toBeTruthy();
	});

	it("announces a resisted Break habit as resisted, never as done", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "No phone in bed", direction: "break" })}
				completed
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("No phone in bed, resisted")).toBeTruthy();
		expect(screen.queryByLabelText("No phone in bed, done")).toBeNull();
	});

	it("announces a due, not-yet-completed habit by name alone, for either direction", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "No phone in bed", direction: "break" })}
				completed={false}
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("No phone in bed")).toBeTruthy();
	});

	it("passes atRisk through to a Break habit's completion circle (HAB-08)", async () => {
		await render(
			<HabitTodayRow
				habit={makeHabit({ name: "No phone in bed", direction: "break" })}
				completed={false}
				atRisk
				onToggle={jest.fn()}
				onPress={jest.fn()}
			/>,
		);
		const flatStyle = StyleSheet.flatten(
			screen.getByLabelText("No phone in bed").props.style,
		);
		expect(flatStyle.borderColor).toBe(semanticColors.light.warnInk);
	});

	describe("a quantity habit (HAB-07)", () => {
		function makeQuantityHabit(overrides = {}) {
			return makeHabit({
				name: "Glass of water",
				targetType: "quantity",
				targetAmount: 8,
				targetUnit: "glasses",
				...overrides,
			});
		}

		it("tapping the completion control opens the quantity sheet, not onToggle", async () => {
			const onToggle = jest.fn();
			const onOpenQuantitySheet = jest.fn();
			await render(
				<HabitTodayRow
					habit={makeQuantityHabit()}
					completed={false}
					quantityValue={3}
					onToggle={onToggle}
					onOpenQuantitySheet={onOpenQuantitySheet}
					onPress={jest.fn()}
				/>,
			);

			await fireEvent.press(
				screen.getByLabelText("Log Glass of water, 3 of 8 glasses"),
			);
			expect(onOpenQuantitySheet).toHaveBeenCalledTimes(1);
			expect(onToggle).not.toHaveBeenCalled();
		});

		it("uses a button role, not a checkbox, for its completion control", async () => {
			await render(
				<HabitTodayRow
					habit={makeQuantityHabit()}
					completed={false}
					quantityValue={3}
					onToggle={jest.fn()}
					onOpenQuantitySheet={jest.fn()}
					onPress={jest.fn()}
				/>,
			);
			expect(
				screen.getByRole("button", {
					name: "Log Glass of water, 3 of 8 glasses",
				}),
			).toBeTruthy();
		});

		it("tapping the name still calls onPress, not onOpenQuantitySheet", async () => {
			const onPress = jest.fn();
			const onOpenQuantitySheet = jest.fn();
			await render(
				<HabitTodayRow
					habit={makeQuantityHabit()}
					completed={false}
					quantityValue={3}
					onToggle={jest.fn()}
					onOpenQuantitySheet={onOpenQuantitySheet}
					onPress={onPress}
				/>,
			);

			await fireEvent.press(screen.getByText("Glass of water"));
			expect(onPress).toHaveBeenCalledTimes(1);
			expect(onOpenQuantitySheet).not.toHaveBeenCalled();
		});
	});
});
