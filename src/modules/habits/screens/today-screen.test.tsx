import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";
import type { Habit } from "../types";
import type { CategoryGroup } from "./today-screen-helpers";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const mockPush = jest.fn();
// Mirrors the real hook closely enough: the callback runs on focus, its
// cleanup on blur (here: unmount).
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
	useFocusEffect: (callback: () => undefined | (() => void)) => {
		const { useEffect } = require("react");
		useEffect(callback, [callback]);
	},
}));

const mockMenu = {
	weekly: { subline: "14 — 20 September · 34 of 42 done" },
	monthly: { subline: "1 — 31 August · 80% done" },
	yearly: { subline: "", disabledReason: "Coming soon" },
	manage: { subline: "7 active · 2 archived" },
	settings: { subline: "Appearance", disabledReason: "Coming soon" },
};
const mockUseTodayMenuQueries = jest.fn(() => mockMenu);
jest.mock("../hooks/use-today-menu-queries", () => ({
	useTodayMenuQueries: () => mockUseTodayMenuQueries(),
}));

const morningHabit = makeHabit({
	id: 1,
	name: "Glass of water",
	category: categoryNamed("Morning"),
});
const eveningHabit = makeHabit({
	id: 2,
	name: "Read",
	category: categoryNamed("Evening"),
});

let mockGroups: CategoryGroup[] = [];
let mockProgress = { completed: 0, total: 0, fraction: 0 };
let mockCompletedHabitIds = new Set<number>();
let mockViewState: "no-habits" | "rest-day" | "day-closed" | "populated" =
	"no-habits";
let mockTomorrowPreview: Habit[] = [];
let mockTomorrowReminderTimes = new Map<number, string>();
let mockCompletedThisWeekByHabitId: Map<number, number> = new Map();
let mockQuantityValuesByHabitId = new Map<number, number>();
const mockToday = new Date("2026-09-16T00:00:00Z");
let mockAtRiskByHabitId = new Map<
	number,
	{ missedDate: Date; currentStreak: number }
>();
let mockFreezesRemainingThisMonth = 2;

jest.mock("../hooks/use-today-queries", () => ({
	useTodayQueries: () => ({
		groups: mockGroups,
		progress: mockProgress,
		completedHabitIds: mockCompletedHabitIds,
		quantityValuesByHabitId: mockQuantityValuesByHabitId,
		completedThisWeekByHabitId: mockCompletedThisWeekByHabitId,
		today: mockToday,
		viewState: mockViewState,
		tomorrowPreview: mockTomorrowPreview,
		tomorrowReminderTimeByHabitId: mockTomorrowReminderTimes,
		atRiskByHabitId: mockAtRiskByHabitId,
		freezesRemainingThisMonth: mockFreezesRemainingThisMonth,
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

const mockLogQuantity = jest.fn();
jest.mock("../hooks/use-quantity-log-actions", () => ({
	useQuantityLogActions: () => ({
		logQuantity: mockLogQuantity,
		isLogging: false,
		logError: null,
	}),
}));

const mockApplyFreeze = jest.fn();
jest.mock("../hooks/use-streak-actions", () => ({
	useStreakActions: () => ({
		applyFreeze: mockApplyFreeze,
		isFreezing: false,
		freezeError: null,
	}),
}));

const mockClearAllHabits = jest.fn();
const mockSeedStreakAtRiskHabit = jest.fn();
jest.mock("../hooks/use-habit-actions", () => ({
	useHabitActions: () => ({
		clearAllHabits: mockClearAllHabits,
		isClearingAll: false,
		seedStreakAtRiskHabit: mockSeedStreakAtRiskHabit,
		isSeedingStreakAtRisk: false,
	}),
}));

let mockHasSeenFirstRun = true;
jest.mock("../hooks/use-first-run-queries", () => ({
	useFirstRunQueries: () => ({
		suggestions: [],
		hasSeenFirstRun: mockHasSeenFirstRun,
	}),
}));
const mockResetFirstRun = jest.fn();
jest.mock("../hooks/use-first-run-actions", () => ({
	useFirstRunActions: () => ({
		addSuggestedHabits: jest.fn(),
		isAdding: false,
		addError: null,
		skipFirstRun: jest.fn(),
		isSkipping: false,
		skipError: null,
		resetFirstRun: mockResetFirstRun,
		isResetting: false,
	}),
}));

import { Alert } from "react-native";
import { useToastStore } from "@/store/toast-store";
import { TodayScreen } from "./today-screen";

describe("TodayScreen", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockToggleCompletion.mockReset();
		mockLogQuantity.mockReset();
		mockClearAllHabits.mockReset();
		mockResetFirstRun.mockReset();
		mockApplyFreeze.mockReset();
		mockSeedStreakAtRiskHabit.mockReset();
		mockGroups = [];
		mockProgress = { completed: 0, total: 0, fraction: 0 };
		mockCompletedHabitIds = new Set();
		mockQuantityValuesByHabitId = new Map();
		mockCompletedThisWeekByHabitId = new Map();
		mockViewState = "no-habits";
		mockTomorrowPreview = [];
		mockTomorrowReminderTimes = new Map();
		useToastStore.setState({ toast: null });
		mockHasSeenFirstRun = true;
		mockAtRiskByHabitId = new Map();
		mockFreezesRemainingThisMonth = 2;
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

	it("shows First Run instead of the empty state on a genuine first launch", async () => {
		mockHasSeenFirstRun = false;

		await render(<TodayScreen />);

		expect(screen.getByText("Pick a couple to start")).toBeTruthy();
		expect(screen.queryByText("Nothing to track yet")).toBeNull();
	});

	it("navigates to new-habit from the empty state's Add habit button", async () => {
		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Add habit"));
		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	it("shows the rest-day state distinctly from empty and day-closed", async () => {
		mockViewState = "rest-day";

		await render(<TodayScreen />);

		expect(screen.getByText("Rest day")).toBeTruthy();
		expect(
			screen.getByText(/Nothing is scheduled for \w+\. Streaks stay intact\./),
		).toBeTruthy();
		expect(screen.queryByText("Nothing to track yet")).toBeNull();
	});

	it("opens the add-habit flow from rest day's Log something anyway", async () => {
		mockViewState = "rest-day";

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Log something anyway"));

		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	it("shows the day-closed celebratory state with tomorrow's preview", async () => {
		mockViewState = "day-closed";
		mockProgress = { completed: 3, total: 3, fraction: 1 };
		mockTomorrowPreview = [morningHabit, eveningHabit];

		await render(<TodayScreen />);

		expect(screen.getByText("All three done")).toBeTruthy();
		expect(screen.getByText("TOMORROW")).toBeTruthy();
		expect(screen.getByText("Glass of water")).toBeTruthy();
		expect(screen.getByText("Read")).toBeTruthy();
	});

	it("omits the tomorrow preview card when nothing is due tomorrow", async () => {
		mockViewState = "day-closed";
		mockProgress = { completed: 1, total: 1, fraction: 1 };
		mockTomorrowPreview = [];

		await render(<TodayScreen />);

		expect(screen.queryByText("TOMORROW")).toBeNull();
	});

	it("Day closed doesn't conjure an Undo from an earlier visit's entries", async () => {
		mockViewState = "day-closed";
		mockProgress = { completed: 1, total: 1, fraction: 1 };

		await render(<TodayScreen />);

		expect(useToastStore.getState().toast).toBeNull();
	});

	it("renders category groups with their mini-counts", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
			{ category: categoryNamed("Evening"), habits: [eveningHabit] },
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
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];
		mockProgress = { completed: 1, total: 2, fraction: 0.5 };

		await render(<TodayScreen />);

		expect(screen.getByText("1 of 2 complete")).toBeTruthy();
		expect(screen.getByText("50%")).toBeTruthy();
	});

	it("tapping a row's completion circle toggles it for today", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("Glass of water"));

		expect(mockToggleCompletion).toHaveBeenCalledWith(1, mockToday, true);
	});

	it("completing confirms with an Undo toast that reverses it", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("Glass of water"));

		const toast = useToastStore.getState().toast;
		expect(toast).toMatchObject({
			message: "Marked 'Glass of water' complete",
			actionLabel: "Undo",
		});
		toast?.onAction?.();
		expect(mockToggleCompletion).toHaveBeenLastCalledWith(1, mockToday, false);
	});

	it("confirms a Break habit as resisted, never as complete (HAB-04)", async () => {
		const breakHabit = makeHabit({
			id: 7,
			name: "No phone in bed",
			category: categoryNamed("Morning"),
			direction: "break",
		});
		mockViewState = "populated";
		mockGroups = [{ category: categoryNamed("Morning"), habits: [breakHabit] }];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("No phone in bed"));

		expect(useToastStore.getState().toast?.message).toBe(
			"Resisted 'No phone in bed'",
		);
	});

	it("un-completing toggles back to false, with no confirmation", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];
		mockCompletedHabitIds = new Set([1]);

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("Glass of water, done"));

		expect(mockToggleCompletion).toHaveBeenCalledWith(1, mockToday, false);
	});

	it("tapping a habit's name navigates toward Habit Detail without crashing", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Glass of water"));

		expect(mockPush).toHaveBeenCalledWith("/habits/1");
	});

	it("subtitles a row with what it asks: a quantity target, or a per-week habit's standing", async () => {
		const readHabit = makeHabit({
			id: 3,
			name: "Read",
			category: categoryNamed("Evening"),
			targetType: "quantity",
			targetAmount: 20,
			targetUnit: "pages",
		});
		const runHabit = makeHabit({
			id: 4,
			name: "Easy run",
			category: categoryNamed("Evening"),
			frequency: { type: "per-week", timesPerWeek: 3 },
		});
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Evening"), habits: [readHabit, runHabit] },
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];
		mockCompletedThisWeekByHabitId = new Map([[4, 2]]);

		await render(<TodayScreen />);

		expect(screen.getByText("20 pages")).toBeTruthy();
		expect(screen.getByText("2 of 3 this week")).toBeTruthy();
		// A plain daily check has nothing to add under its name.
		expect(screen.queryByText(/daily/i)).toBeNull();
	});

	it("tapping a quantity habit's row opens the Quantity Log sheet instead of toggling", async () => {
		const quantityHabit = makeHabit({
			id: 3,
			name: "Glass of water",
			category: categoryNamed("Morning"),
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [quantityHabit] },
		];
		mockQuantityValuesByHabitId = new Map([[3, 3]]);

		await render(<TodayScreen />);
		await fireEvent.press(
			screen.getByLabelText("Log Glass of water, 3 of 8 glasses"),
		);

		expect(screen.getByText("Save 3 of 8")).toBeTruthy();
		expect(mockToggleCompletion).not.toHaveBeenCalled();
	});

	it("saving the Quantity Log sheet logs the value for today and closes it", async () => {
		const quantityHabit = makeHabit({
			id: 3,
			name: "Glass of water",
			category: categoryNamed("Morning"),
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [quantityHabit] },
		];
		mockQuantityValuesByHabitId = new Map([[3, 3]]);
		mockLogQuantity.mockResolvedValue(undefined);

		await render(<TodayScreen />);
		await fireEvent.press(
			screen.getByLabelText("Log Glass of water, 3 of 8 glasses"),
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		await fireEvent.press(screen.getByText("Save 4 of 8"));

		expect(mockLogQuantity).toHaveBeenCalledWith(3, mockToday, 4);
		await waitFor(() => expect(screen.queryByText("Save 4 of 8")).toBeNull());
		// Still short of the target — nothing completed, so nothing to confirm.
		expect(useToastStore.getState().toast).toBeNull();
	});

	it("a quantity save that reaches the target confirms it; Undo restores the previous amount", async () => {
		const quantityHabit = makeHabit({
			id: 3,
			name: "Glass of water",
			category: categoryNamed("Morning"),
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [quantityHabit] },
		];
		mockQuantityValuesByHabitId = new Map([[3, 7]]);
		mockLogQuantity.mockResolvedValue(undefined);

		await render(<TodayScreen />);
		await fireEvent.press(
			screen.getByLabelText("Log Glass of water, 7 of 8 glasses"),
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		await fireEvent.press(screen.getByText("Save 8 of 8"));

		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Marked 'Glass of water' complete");
		toast?.onAction?.();
		expect(mockLogQuantity).toHaveBeenLastCalledWith(3, mockToday, 7);
	});

	it("still offers a way to add a habit once habits already exist", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Add habit"));

		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	it("shows each tomorrow habit's reminder time, and nothing for one without a reminder", async () => {
		mockViewState = "day-closed";
		mockProgress = { completed: 3, total: 3, fraction: 1 };
		mockTomorrowPreview = [morningHabit, eveningHabit];
		mockTomorrowReminderTimes = new Map([[1, "07:00"]]);

		await render(<TodayScreen />);

		expect(screen.getByText("07:00")).toBeTruthy();
		expect(screen.queryAllByText(/^\d\d:\d\d$/)).toHaveLength(1);
	});

	describe("navigation menu (HAB-14)", () => {
		const states = [
			"no-habits",
			"rest-day",
			"day-closed",
			"populated",
		] as const;

		beforeEach(() => {
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
		});

		it("no longer shows the temporary Weekly summary / Manage habits buttons", async () => {
			mockViewState = "populated";
			await render(<TodayScreen />);
			expect(screen.queryByText("Weekly summary")).toBeNull();
			expect(screen.queryByText("Manage habits")).toBeNull();
		});

		it.each(states)("offers the ⋯ button in the %s state", async (state) => {
			mockViewState = state;
			await render(<TodayScreen />);
			const button = screen.getByLabelText("More");
			expect(button.props.accessibilityState).toMatchObject({
				expanded: false,
			});
		});

		it.each(states)(
			"opens the menu with its five rows from the %s state",
			async (state) => {
				mockViewState = state;
				await render(<TodayScreen />);
				await fireEvent.press(screen.getByLabelText("More"));

				// The open menu is a modal view, so the button behind it leaves the a11y tree.
				expect(
					screen.getByLabelText("More", { includeHiddenElements: true }).props
						.accessibilityState,
				).toMatchObject({
					expanded: true,
				});
				for (const title of [
					"Weekly summary",
					"Monthly",
					"Yearly",
					"Manage & archive",
					"Settings",
				]) {
					expect(screen.getByText(title)).toBeTruthy();
				}
				expect(screen.getByLabelText("Close menu")).toBeTruthy();
			},
		);

		it("closes on the scrim", async () => {
			mockViewState = "populated";
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("More"));
			await fireEvent.press(screen.getByLabelText("Close menu"));
			expect(screen.queryByText("Weekly summary")).toBeNull();
		});

		it("closes when ⋯ is pressed again", async () => {
			mockViewState = "populated";
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("More"));
			await fireEvent.press(
				screen.getByLabelText("More", { includeHiddenElements: true }),
			);
			expect(screen.queryByText("Weekly summary")).toBeNull();
		});

		it.each([
			["Weekly summary", "/habits/week"],
			["Monthly", "/habits/month"],
			["Manage & archive", "/habits/manage"],
		])("%s navigates and closes the menu", async (title, href) => {
			mockViewState = "populated";
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("More"));
			await fireEvent.press(screen.getByText(title));

			expect(mockPush).toHaveBeenCalledWith(href);
			expect(screen.queryByText(title)).toBeNull();
		});

		it("disabled rows do nothing but close nothing either", async () => {
			mockViewState = "populated";
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("More"));
			await fireEvent.press(screen.getByLabelText("Yearly, Coming soon"));

			expect(mockPush).not.toHaveBeenCalled();
			expect(screen.getByText("Yearly")).toBeTruthy();
		});

		it("computes the rows' live context only while the menu is open (HAB-16)", async () => {
			mockViewState = "populated";
			mockUseTodayMenuQueries.mockClear();
			await render(<TodayScreen />);
			expect(mockUseTodayMenuQueries).not.toHaveBeenCalled();

			await fireEvent.press(screen.getByLabelText("More"));
			expect(mockUseTodayMenuQueries).toHaveBeenCalled();
			expect(screen.getByText("1 — 31 August · 80% done")).toBeTruthy();
		});

		it("opens Settings from the menu (HAB-15)", async () => {
			mockViewState = "populated";
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("More"));
			await fireEvent.press(screen.getByText("Settings"));

			expect(mockPush).toHaveBeenCalledWith("/habits/settings");
		});

		it("shows each row's live context", async () => {
			mockViewState = "populated";
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("More"));
			expect(
				screen.getByText("14 — 20 September · 34 of 42 done"),
			).toBeTruthy();
			expect(screen.getByText("7 active · 2 archived")).toBeTruthy();
		});
	});

	it("offers the streak-at-risk dev seed button from the empty state too", async () => {
		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Seed streak-at-risk habit (dev)"));
		expect(mockSeedStreakAtRiskHabit).toHaveBeenCalledTimes(1);
	});

	it("offers the streak-at-risk dev seed button once habits already exist", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Seed streak-at-risk habit (dev)"));
		expect(mockSeedStreakAtRiskHabit).toHaveBeenCalledTimes(1);
	});

	describe("streak-at-risk (HAB-08)", () => {
		it("tapping an at-risk habit's row opens the sheet instead of navigating", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			mockAtRiskByHabitId = new Map([
				[1, { missedDate: new Date("2026-09-15"), currentStreak: 24 }],
			]);

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Glass of water"));

			expect(mockPush).not.toHaveBeenCalled();
			expect(screen.getByText("You missed yesterday")).toBeTruthy();
			expect(
				screen.getByText(
					"Use a freeze to keep your 24-day streak, or let it reset and start again today. Either is fine.",
				),
			).toBeTruthy();
		});

		it("tapping a not-at-risk habit's row still navigates as before", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Glass of water"));

			expect(mockPush).toHaveBeenCalledWith("/habits/1");
		});

		it("Use a freeze applies it for the missed date and closes the sheet", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			const missedDate = new Date("2026-09-15");
			mockAtRiskByHabitId = new Map([[1, { missedDate, currentStreak: 24 }]]);
			mockApplyFreeze.mockResolvedValue(undefined);

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Glass of water"));
			await fireEvent.press(screen.getByText("Use a freeze"));

			expect(mockApplyFreeze).toHaveBeenCalledWith(1, missedDate);
			await waitFor(() =>
				expect(screen.queryByText("You missed yesterday")).toBeNull(),
			);
		});

		it("Reset and start today closes the sheet without calling applyFreeze", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			mockAtRiskByHabitId = new Map([
				[1, { missedDate: new Date("2026-09-15"), currentStreak: 24 }],
			]);

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Glass of water"));
			await fireEvent.press(screen.getByText("Reset and start today"));

			expect(mockApplyFreeze).not.toHaveBeenCalled();
			expect(screen.queryByText("You missed yesterday")).toBeNull();
		});
	});

	it("asks for confirmation before clearing all habits, and only clears on confirm", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];
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

	it("asks for confirmation before resetting First Run, and only resets on confirm", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation();

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Reset First Run (dev)"));

		expect(alertSpy).toHaveBeenCalledTimes(1);
		expect(mockResetFirstRun).not.toHaveBeenCalled();

		const buttons = alertSpy.mock.calls[0][2];
		const confirmButton = buttons?.find((button) => button.text === "Reset");
		confirmButton?.onPress?.();

		expect(mockResetFirstRun).toHaveBeenCalledTimes(1);
		alertSpy.mockRestore();
	});

	it("offers Reset First Run (dev) from the empty state too", async () => {
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation();

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Reset First Run (dev)"));

		const buttons = alertSpy.mock.calls[0][2];
		const confirmButton = buttons?.find((button) => button.text === "Reset");
		confirmButton?.onPress?.();

		expect(mockResetFirstRun).toHaveBeenCalledTimes(1);
		alertSpy.mockRestore();
	});
});
