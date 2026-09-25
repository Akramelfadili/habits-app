import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Habit } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

const mockCreateHabit = jest.fn();
const mockUpdateHabit = jest.fn();
jest.mock("../hooks/use-habit-actions", () => ({
	useHabitActions: () => ({
		createHabit: (...args: unknown[]) => mockCreateHabit(...args),
		updateHabit: (...args: unknown[]) => mockUpdateHabit(...args),
		isCreating: false,
		isUpdating: false,
		createError: null,
		updateError: null,
	}),
}));

let mockHabits: Habit[] = [];
jest.mock("../hooks/use-habit-queries", () => ({
	useHabitQueries: () => ({
		habits: mockHabits,
		categories: ["Morning", "Evening"],
		getHabitById: (id: number) => mockHabits.find((habit) => habit.id === id),
	}),
}));

import { HabitFormScreen } from "./habit-form-screen";

const existingHabit = makeHabit({
	name: "Gym",
	icon: "flame",
	category: "Morning",
	frequency: { type: "weekdays", days: [1, 3, 5] },
});

const isSaveDisabled = () =>
	screen.getByText("Save habit").parent?.props.accessibilityState.disabled;
const isSelected = (label: string) =>
	screen.getByLabelText(label).props.accessibilityState.selected;

describe("HabitFormScreen — create mode", () => {
	beforeEach(() => {
		mockBack.mockReset();
		mockCreateHabit.mockReset().mockResolvedValue(existingHabit);
		mockUpdateHabit.mockReset();
		mockHabits = [];
	});

	it("disables Save until a name is entered", async () => {
		await render(<HabitFormScreen />);

		expect(
			screen.getByText("Save habit").parent?.props.accessibilityState.disabled,
		).toBe(true);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Read");
		expect(
			screen.getByText("Save habit").parent?.props.accessibilityState.disabled,
		).toBe(false);
	});

	it("defaults to the first color not already used by another habit", async () => {
		mockHabits = [
			{ ...existingHabit, id: 1, color: "blue" },
			{ ...existingHabit, id: 2, color: "purple" },
		];
		await render(<HabitFormScreen />);

		// HABIT_COLORS order is blue, purple, orange, green, red, teal — orange is first free.
		await waitFor(() =>
			expect(
				screen.getByLabelText("orange").props.accessibilityState.selected,
			).toBe(true),
		);
		expect(
			screen.getByLabelText("blue").props.accessibilityState.selected,
		).toBe(false);
	});

	it("selects an icon when tapped", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.press(screen.getByLabelText("flame"));
		expect(
			screen.getByLabelText("flame").props.accessibilityState.selected,
		).toBe(true);
		expect(screen.getByLabelText("dot").props.accessibilityState.selected).toBe(
			false,
		);
	});

	it("creates the habit with a trimmed name and null category when submitted", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "  Read  ");
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Read",
				category: null,
				direction: "build",
				targetType: "simple",
				frequency: { type: "daily" },
			}),
		);
		expect(mockBack).toHaveBeenCalledTimes(1);
	});

	it("shows Anytime as the category row's value when none is set", async () => {
		await render(<HabitFormScreen />);
		expect(screen.getByText("Anytime")).toBeTruthy();
	});

	it("opens a sheet with suggestions when the Category row is tapped", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.press(screen.getByText("Category"));
		expect(screen.getByText("Morning")).toBeTruthy();
		expect(screen.getByText("Evening")).toBeTruthy();
	});

	it("fills the category from a tapped suggestion and closes the sheet", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.press(screen.getByText("Category"));
		await fireEvent.press(screen.getByText("Morning"));

		expect(screen.getByText("Morning")).toBeTruthy();
		expect(screen.queryByText("Evening")).toBeNull();
	});

	it("shows the direction explanation caption in create mode too", async () => {
		await render(<HabitFormScreen />);
		expect(screen.getByText(/checking it off means you did it/)).toBeTruthy();
	});

	it("disables Quantity and resets it to Simple check when Direction switches to Break", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.press(screen.getByText("Quantity"));
		expect(
			screen.getByText("Quantity").parent?.props.accessibilityState.selected,
		).toBe(true);

		await fireEvent.press(screen.getByText("Break"));

		await waitFor(() =>
			expect(
				screen.getByText("Simple check").parent?.props.accessibilityState
					.selected,
			).toBe(true),
		);
		expect(
			screen.getByText("Quantity").parent?.props.accessibilityState.disabled,
		).toBe(true);
		expect(
			screen.getByText(/quantity targets aren't available for Break/),
		).toBeTruthy();
	});

	it("saves a Break habit with targetType simple even if Quantity was picked first", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "No phone");
		await fireEvent.press(screen.getByText("Quantity"));
		await fireEvent.press(screen.getByText("Break"));
		await waitFor(() =>
			expect(
				screen.getByText("Simple check").parent?.props.accessibilityState
					.selected,
			).toBe(true),
		);

		await fireEvent.press(screen.getByText("Save habit"));
		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({ direction: "break", targetType: "simple" }),
		);
	});

	it("reveals Amount and Unit fields when Quantity is selected", async () => {
		await render(<HabitFormScreen />);

		expect(screen.queryByPlaceholderText("glasses")).toBeNull();
		await fireEvent.press(screen.getByText("Quantity"));
		expect(screen.getByText("Amount")).toBeTruthy();
		expect(screen.getByPlaceholderText("glasses")).toBeTruthy();
	});

	it("blocks Save until a unit is entered for a Quantity habit", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Water");
		expect(isSaveDisabled()).toBe(false);

		await fireEvent.press(screen.getByText("Quantity"));
		expect(isSaveDisabled()).toBe(true);

		await fireEvent.changeText(
			screen.getByPlaceholderText("glasses"),
			"glasses",
		);
		expect(isSaveDisabled()).toBe(false);
	});

	it("creates a Quantity habit with its amount and unit", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Water");
		await fireEvent.press(screen.getByText("Quantity"));
		await fireEvent.changeText(
			screen.getByPlaceholderText("glasses"),
			"glasses",
		);
		await fireEvent.press(screen.getByLabelText("Increase target amount"));
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				targetType: "quantity",
				targetAmount: 9,
				targetUnit: "glasses",
			}),
		);
	});

	it("clears amount and unit to null when Quantity is switched back to Simple check", async () => {
		await render(<HabitFormScreen />);

		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Water");
		await fireEvent.press(screen.getByText("Quantity"));
		await fireEvent.changeText(
			screen.getByPlaceholderText("glasses"),
			"glasses",
		);
		await fireEvent.press(screen.getByText("Simple check"));
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				targetType: "simple",
				targetAmount: null,
				targetUnit: null,
			}),
		);
	});
});

describe("HabitFormScreen — frequency", () => {
	beforeEach(() => {
		mockBack.mockReset();
		mockCreateHabit.mockReset().mockResolvedValue(existingHabit);
		mockHabits = [];
	});

	async function renderNamed() {
		await render(<HabitFormScreen />);
		await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "Gym");
	}

	it("offers all three modes, defaulting to Daily with no day picker", async () => {
		await render(<HabitFormScreen />);

		expect(
			screen.getByText("Daily").parent?.props.accessibilityState.selected,
		).toBe(true);
		expect(screen.getByText("Specific weekdays")).toBeTruthy();
		expect(screen.getByText("X per week")).toBeTruthy();
		expect(screen.queryByLabelText("Monday")).toBeNull();
	});

	it("blocks Save with an inline message when Specific weekdays has no days", async () => {
		await renderNamed();
		expect(isSaveDisabled()).toBe(false);

		await fireEvent.press(screen.getByText("Specific weekdays"));
		expect(isSaveDisabled()).toBe(true);
		expect(screen.getByText("Pick at least one day.")).toBeTruthy();

		await fireEvent.press(screen.getByLabelText("Wednesday"));
		expect(isSaveDisabled()).toBe(false);
		expect(screen.queryByText("Pick at least one day.")).toBeNull();
	});

	it("Weekdays shortcut pre-fills Mon–Fri, which stay individually editable", async () => {
		await renderNamed();
		await fireEvent.press(screen.getByText("Specific weekdays"));
		await fireEvent.press(screen.getByText("Weekdays shortcut"));

		expect(
			["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].every(
				isSelected,
			),
		).toBe(true);
		expect(isSelected("Saturday")).toBe(false);

		await fireEvent.press(screen.getByLabelText("Tuesday"));
		await fireEvent.press(screen.getByLabelText("Sunday"));
		expect(
			screen.getByText("Specific weekdays").parent?.props.accessibilityState
				.selected,
		).toBe(true);

		await fireEvent.press(screen.getByText("Save habit"));
		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				frequency: { type: "weekdays", days: [1, 3, 4, 5, 7] },
			}),
		);
	});

	it("saves an X-per-week count from the stepper", async () => {
		await renderNamed();
		await fireEvent.press(screen.getByText("X per week"));

		expect(screen.getByText("3")).toBeTruthy();
		await fireEvent.press(screen.getByLabelText("Increase times per week"));
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));
		expect(mockCreateHabit).toHaveBeenCalledWith(
			expect.objectContaining({
				frequency: { type: "per-week", timesPerWeek: 4 },
			}),
		);
	});
});

describe("HabitFormScreen — edit mode", () => {
	beforeEach(() => {
		mockBack.mockReset();
		mockCreateHabit.mockReset();
		mockUpdateHabit.mockReset().mockResolvedValue(existingHabit);
		mockHabits = [existingHabit];
	});

	it("pre-fills the form from the existing habit", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());
		expect(screen.getByText("Morning")).toBeTruthy();
		expect(
			screen.getByText("Specific weekdays").parent?.props.accessibilityState
				.selected,
		).toBe(true);
		expect(
			["Monday", "Tuesday", "Wednesday", "Friday"].map(isSelected),
		).toEqual([true, false, true, true]);
	});

	it("lets frequency change in edit mode", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());

		await fireEvent.press(screen.getByText("Daily"));
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockUpdateHabit).toHaveBeenCalledTimes(1));
		expect(mockUpdateHabit).toHaveBeenCalledWith(
			1,
			expect.objectContaining({ frequency: { type: "daily" } }),
		);
	});

	it("locks Direction and shows the explanatory caption", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());

		expect(screen.getByText(/checking it off means you did it/)).toBeTruthy();
		expect(
			screen.getByText("Break").parent?.props.accessibilityState.disabled,
		).toBe(true);
	});

	it("pre-fills Amount and Unit from an existing Quantity habit", async () => {
		const quantityHabit = makeHabit({
			id: 2,
			name: "Read before bed",
			targetType: "quantity",
			targetAmount: 20,
			targetUnit: "pages",
		});
		mockHabits = [quantityHabit];

		await render(<HabitFormScreen habitId={2} />);
		await waitFor(() =>
			expect(screen.getByDisplayValue("Read before bed")).toBeTruthy(),
		);
		expect(screen.getByText("20")).toBeTruthy();
		expect(screen.getByDisplayValue("pages")).toBeTruthy();
	});

	it("updates the habit without touching direction", async () => {
		await render(<HabitFormScreen habitId={1} />);
		await waitFor(() => expect(screen.getByDisplayValue("Gym")).toBeTruthy());

		await fireEvent.changeText(screen.getByDisplayValue("Gym"), "Gym session");
		await fireEvent.press(screen.getByText("Save habit"));

		await waitFor(() => expect(mockUpdateHabit).toHaveBeenCalledTimes(1));
		expect(mockUpdateHabit).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				name: "Gym session",
				category: "Morning",
				targetType: "simple",
			}),
		);
		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
