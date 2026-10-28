import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

import { habitPickerSubtitle } from "./habit-picker-helpers";
import { HabitPickerSheet } from "./habit-picker-sheet";

const read = makeHabit({
	id: 1,
	name: "Read",
	frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
});
const water = makeHabit({
	id: 2,
	name: "Glass of water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});

async function renderPicker(
	props: Partial<React.ComponentProps<typeof HabitPickerSheet>> = {},
) {
	const onSelect = jest.fn();
	const onDismiss = jest.fn();
	await render(
		<HabitPickerSheet
			visible
			habits={[read, water]}
			loggedHabitIds={new Set()}
			onSelect={onSelect}
			onDismiss={onDismiss}
			{...props}
		/>,
	);
	return { onSelect, onDismiss };
}

describe("HabitPickerSheet", () => {
	it("lists each habit with its schedule; quantity habits offer an Amount", async () => {
		await renderPicker();
		expect(screen.getByText("Mon–Fri")).toBeTruthy();
		expect(screen.getByText("Every day · 8 glasses")).toBeTruthy();
		expect(screen.getByText("Amount")).toBeTruthy();
		expect(
			screen.getByRole("checkbox", { name: "Log Read off-schedule" }),
		).toBeTruthy();
	});

	it("hands a tapped habit up", async () => {
		const { onSelect } = await renderPicker();
		await fireEvent.press(
			screen.getByRole("checkbox", { name: "Log Read off-schedule" }),
		);
		await fireEvent.press(
			screen.getByRole("button", { name: "Log Glass of water, set an amount" }),
		);
		expect(onSelect.mock.calls.map(([habit]) => habit.id)).toEqual([1, 2]);
	});

	it("shows a habit already logged off-schedule as checked, and tapping does nothing", async () => {
		const { onSelect } = await renderPicker({ loggedHabitIds: new Set([1]) });
		const logged = screen.getByRole("checkbox", {
			name: "Read, logged off-schedule",
		});
		expect(logged).toBeChecked();
		await fireEvent.press(logged);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("explains itself when nothing is eligible, rather than showing an empty list", async () => {
		await renderPicker({ habits: [] });
		expect(screen.getByText("Nothing to log here")).toBeTruthy();
		expect(screen.getByText(/Break habits and archived habits/)).toBeTruthy();
	});

	it("Close dismisses", async () => {
		const { onDismiss } = await renderPicker();
		await fireEvent.press(screen.getByRole("button", { name: "Close" }));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});

describe("picker copy", () => {
	it("names a run of weekdays as a range and a gap as a list", () => {
		expect(habitPickerSubtitle(read)).toBe("Mon–Fri");
		expect(
			habitPickerSubtitle(
				makeHabit({ frequency: { type: "weekdays", days: [2, 4] } }),
			),
		).toBe("Tue, Thu");
	});
});
