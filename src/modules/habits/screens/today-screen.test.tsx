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

const morningHabit = makeHabit({
	id: 1,
	name: "Glass of water",
	category: "Morning",
});
const eveningHabit = makeHabit({ id: 2, name: "Read", category: "Evening" });

let mockTotalHabitCount = 0;
let mockGroups: { category: string; habits: Habit[] }[] = [];
let mockProgress = { completed: 0, total: 0, fraction: 0 };
let mockCompletedHabitIds = new Set<number>();
const mockToday = new Date("2026-09-16T00:00:00Z");

jest.mock("../hooks/use-today-queries", () => ({
	useTodayQueries: () => ({
		totalHabitCount: mockTotalHabitCount,
		groups: mockGroups,
		progress: mockProgress,
		completedHabitIds: mockCompletedHabitIds,
		today: mockToday,
	}),
}));

const mockToggleCompletion = jest.fn();
jest.mock("../hooks/use-today-actions", () => ({
	useTodayActions: () => ({
		toggleCompletion: mockToggleCompletion,
		isToggling: false,
		toggleError: null,
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
import { TodayScreen } from "./today-screen";

describe("TodayScreen", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToggleCompletion.mockReset();
		mockClearAllHabits.mockReset();
		mockTotalHabitCount = 0;
		mockGroups = [];
		mockProgress = { completed: 0, total: 0, fraction: 0 };
		mockCompletedHabitIds = new Set();
	});

	it("shows the no-habits-yet empty state when there are no habits at all", async () => {
		await render(<TodayScreen />);
		expect(screen.getByText("Nothing to track yet")).toBeTruthy();
		expect(
			screen.getByText(
				"Add your first habit and it will show up here every morning.",
			),
		).toBeTruthy();
	});

	it("navigates to new-habit from the empty state's Add habit button", async () => {
		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Add habit"));
		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	it("renders category groups with their mini-counts", async () => {
		mockTotalHabitCount = 2;
		mockGroups = [
			{ category: "Morning", habits: [morningHabit] },
			{ category: "Evening", habits: [eveningHabit] },
		];
		mockCompletedHabitIds = new Set([1]);

		await render(<TodayScreen />);

		expect(screen.getByText("Morning")).toBeTruthy();
		expect(screen.getByText("1/1")).toBeTruthy();
		expect(screen.getByText("Evening")).toBeTruthy();
		expect(screen.getByText("0/1")).toBeTruthy();
		expect(screen.getByText("Glass of water")).toBeTruthy();
		expect(screen.getByText("Read")).toBeTruthy();
	});

	it("renders the overall progress line", async () => {
		mockTotalHabitCount = 2;
		mockGroups = [{ category: "Morning", habits: [morningHabit] }];
		mockProgress = { completed: 1, total: 2, fraction: 0.5 };

		await render(<TodayScreen />);

		expect(screen.getByText("1 of 2 complete")).toBeTruthy();
		expect(screen.getByText("50%")).toBeTruthy();
	});

	it("tapping a row's completion circle toggles it for today", async () => {
		mockTotalHabitCount = 1;
		mockGroups = [{ category: "Morning", habits: [morningHabit] }];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("Glass of water"));

		expect(mockToggleCompletion).toHaveBeenCalledWith(1, mockToday, true);
	});

	it("un-completing toggles back to false, with no confirmation", async () => {
		mockTotalHabitCount = 1;
		mockGroups = [{ category: "Morning", habits: [morningHabit] }];
		mockCompletedHabitIds = new Set([1]);

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("Glass of water"));

		expect(mockToggleCompletion).toHaveBeenCalledWith(1, mockToday, false);
	});

	it("tapping a habit's name navigates toward Habit Detail without crashing", async () => {
		mockTotalHabitCount = 1;
		mockGroups = [{ category: "Morning", habits: [morningHabit] }];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Glass of water"));

		expect(mockPush).toHaveBeenCalledWith("/habit/1");
	});

	it("still offers a way to add a habit once habits already exist", async () => {
		mockTotalHabitCount = 1;
		mockGroups = [{ category: "Morning", habits: [morningHabit] }];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Add habit"));

		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	it("asks for confirmation before clearing all habits, and only clears on confirm", async () => {
		mockTotalHabitCount = 1;
		mockGroups = [{ category: "Morning", habits: [morningHabit] }];
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation();

		await render(<TodayScreen />);
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
