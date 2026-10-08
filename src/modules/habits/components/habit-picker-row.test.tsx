import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { HabitPickerRow } from "./habit-picker-row";

const check = makeHabit({ name: "Walk", frequency: { type: "daily" } });
const quantity = makeHabit({
	name: "Water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});

describe("HabitPickerRow", () => {
	it("logs a check habit straight away from its row or its check", async () => {
		const onSelect = jest.fn();
		await render(
			<HabitPickerRow habit={check} logged={false} onSelect={onSelect} />,
		);

		expect(screen.getByText("Every day")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("checkbox", { name: "Log Walk off-schedule" }),
		);
		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it("hands a quantity habit off with 'Amount' instead of a check", async () => {
		const onSelect = jest.fn();
		await render(
			<HabitPickerRow habit={quantity} logged={false} onSelect={onSelect} />,
		);

		expect(screen.getByText("Amount")).toBeTruthy();
		expect(screen.queryByRole("checkbox")).toBeNull();
		await fireEvent.press(screen.getByLabelText("Log Water, set an amount"));
		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it("shows an already-logged habit checked and does nothing when tapped", async () => {
		const onSelect = jest.fn();
		await render(
			<HabitPickerRow habit={quantity} logged onSelect={onSelect} />,
		);

		expect(
			screen.getByRole("checkbox", { name: "Water, logged off-schedule" }),
		).toBeChecked();
		expect(screen.queryByText("Amount")).toBeNull();
		await fireEvent.press(
			screen.getByRole("checkbox", { name: "Water, logged off-schedule" }),
		);
		expect(onSelect).not.toHaveBeenCalled();
	});
});
