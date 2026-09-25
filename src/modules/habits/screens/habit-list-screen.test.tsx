import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";
import type { Habit } from "../types";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));

let mockHabits: Habit[] = [];
jest.mock("../hooks/use-habit-queries", () => ({
	useHabitQueries: () => ({
		habits: mockHabits,
		categories: [],
		getHabitById: jest.fn(),
	}),
}));

const mockClearAllHabits = jest.fn();
jest.mock("../hooks/use-habit-actions", () => ({
	useHabitActions: () => ({
		clearAllHabits: mockClearAllHabits,
		isClearingAll: false,
	}),
}));

import { Alert } from "react-native";
import { HabitListScreen } from "./habit-list-screen";

const habit = makeHabit({
	name: "Gym",
	icon: "flame",
	color: "orange",
	category: "Morning",
});

describe("HabitListScreen", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockHabits = [];
		mockClearAllHabits.mockReset();
	});

	it("shows the empty message when there are no habits", async () => {
		await render(<HabitListScreen />);
		expect(screen.getByText("Nothing to track yet.")).toBeTruthy();
	});

	it("renders a row per habit with its name and category", async () => {
		mockHabits = [habit];
		await render(<HabitListScreen />);

		expect(screen.getByText("Gym")).toBeTruthy();
		expect(screen.getByText("Morning")).toBeTruthy();
	});

	it("falls back to Anytime for a habit with no category", async () => {
		mockHabits = [{ ...habit, category: null }];
		await render(<HabitListScreen />);
		expect(screen.getByText("Anytime")).toBeTruthy();
	});

	it("navigates to the new-habit route when Add habit is tapped", async () => {
		await render(<HabitListScreen />);

		await fireEvent.press(screen.getByText("Add habit"));
		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	it("navigates to edit-habit with the habit's id when a row is tapped", async () => {
		mockHabits = [habit];
		await render(<HabitListScreen />);

		await fireEvent.press(screen.getByText("Gym"));
		expect(mockPush).toHaveBeenCalledWith("/edit-habit/1");
	});

	it("asks for confirmation before clearing all habits, and only clears on confirm", async () => {
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation();
		await render(<HabitListScreen />);

		await fireEvent.press(screen.getByText("Clear all habits (dev)"));
		expect(alertSpy).toHaveBeenCalledTimes(1);
		expect(mockClearAllHabits).not.toHaveBeenCalled();

		const buttons = alertSpy.mock.calls[0][2];
		const confirmButton = buttons?.find((button) => button.text === "Clear");
		confirmButton?.onPress?.();

		expect(mockClearAllHabits).toHaveBeenCalledTimes(1);
		alertSpy.mockRestore();
	});
});
