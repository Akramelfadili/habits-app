import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { format } from "date-fns";
import type { CategoryGroup } from "../presenters/today-screen-helpers";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";
import { mockMeasureInWindow } from "../test-support/measure-in-window";
import type { Entry, Habit } from "../types";

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
let mockViewState: "no-habits" | "rest-day" | "populated" = "no-habits";
let mockCompletedThisWeekByHabitId: Map<number, number> = new Map();
let mockQuantityValuesByHabitId = new Map<number, number>();
const mockToday = new Date(2026, 8, 16);
const OK = {
	ok: true,
	value: { returnedFreeze: null, freezesLeft: 2 },
} as const;
let mockIsLoaded = true;
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
		selectedDay: mockToday,
		isLoaded: mockIsLoaded,
		viewState: mockViewState,
		atRiskByHabitId: mockAtRiskByHabitId,
		freezesRemainingThisMonth: mockFreezesRemainingThisMonth,
	}),
}));

let mockEligibleHabits: Habit[] = [];
let mockLoggedToday: { habit: Habit; entry: Entry }[] = [];
jest.mock("../hooks/use-off-schedule-queries", () => ({
	useOffScheduleQueries: () => ({
		eligibleHabits: mockEligibleHabits,
		loggedToday: mockLoggedToday,
	}),
}));

const mockToggleCompletion = jest.fn();
const mockRestoreDay = jest.fn();
jest.mock("../hooks/use-today-actions", () => ({
	useTodayActions: () => ({
		toggleCompletion: mockToggleCompletion,
		restoreDay: mockRestoreDay,
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
const mockUndoFreeze = jest.fn();
jest.mock("../hooks/use-streak-actions", () => ({
	useStreakActions: () => ({
		applyFreeze: mockApplyFreeze,
		undoFreeze: mockUndoFreeze,
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
import {
	TOAST_DURATION_MS,
	ToastHost,
} from "@/components/ui/composite/toast-host";
import { useToastStore } from "@/store/toast-store";
import { TodayScreen } from "./today-screen";

/** Only Date is faked: writes read the clock and must land on mockToday. */
function fakeDate(now: Date) {
	jest.useFakeTimers({
		now,
		doNotFake: [
			"nextTick",
			"setImmediate",
			"clearImmediate",
			"setTimeout",
			"clearTimeout",
			"setInterval",
			"clearInterval",
			"queueMicrotask",
			"requestAnimationFrame",
			"cancelAnimationFrame",
			"performance",
			"hrtime",
		],
	});
}

describe("TodayScreen", () => {
	let measureSpy: jest.SpyInstance;

	beforeEach(() => {
		fakeDate(new Date(2026, 8, 16, 12));
		measureSpy = mockMeasureInWindow();
		mockIsLoaded = true;
		mockPush.mockReset();
		mockToggleCompletion.mockReset().mockResolvedValue(OK);
		mockRestoreDay
			.mockReset()
			.mockResolvedValue({ ok: true, value: undefined });
		mockLogQuantity.mockReset().mockResolvedValue(OK);
		mockClearAllHabits.mockReset();
		mockResetFirstRun.mockReset();
		mockApplyFreeze
			.mockReset()
			.mockResolvedValue({ ok: true, value: { freezesLeft: 1 } });
		mockUndoFreeze.mockReset().mockResolvedValue(OK);
		mockSeedStreakAtRiskHabit.mockReset();
		mockGroups = [];
		mockProgress = { completed: 0, total: 0, fraction: 0 };
		mockCompletedHabitIds = new Set();
		mockQuantityValuesByHabitId = new Map();
		mockCompletedThisWeekByHabitId = new Map();
		mockViewState = "no-habits";
		useToastStore.setState({ toast: null });
		mockHasSeenFirstRun = true;
		mockAtRiskByHabitId = new Map();
		mockFreezesRemainingThisMonth = 2;
		mockEligibleHabits = [];
		mockLoggedToday = [];
	});

	afterEach(() => {
		jest.useRealTimers();
		measureSpy.mockRestore();
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

	it("shows the rest-day state distinctly from empty and populated", async () => {
		mockViewState = "rest-day";

		await render(<TodayScreen />);

		expect(screen.getByText("Rest day")).toBeTruthy();
		expect(
			screen.getByText(/Nothing is scheduled for \w+\. Streaks stay intact\./),
		).toBeTruthy();
		expect(screen.queryByText("Nothing to track yet")).toBeNull();
	});

	describe("rest day: Log something anyway (HAB-18)", () => {
		const read = makeHabit({ id: 5, name: "Read" });
		const water = makeHabit({
			id: 6,
			name: "Glass of water",
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});

		beforeEach(() => {
			mockViewState = "rest-day";
			mockToggleCompletion.mockResolvedValue(OK);
			mockLogQuantity.mockResolvedValue(OK);
		});

		it("opens the habit picker, not New habit", async () => {
			mockEligibleHabits = [read];
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Log something anyway"));

			expect(screen.getByText("Log off-schedule")).toBeTruthy();
			expect(screen.getByText("Read")).toBeTruthy();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("shows the 'nothing eligible' state when no habit can be logged", async () => {
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Log something anyway"));
			expect(screen.getByText("Nothing to log here")).toBeTruthy();
		});

		it("logs a check habit, confirms with a toast, and Undo removes exactly that entry", async () => {
			mockEligibleHabits = [read];
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Log something anyway"));
			await fireEvent.press(
				screen.getByRole("checkbox", { name: "Log Read off-schedule" }),
			);

			expect(mockToggleCompletion).toHaveBeenCalledWith(5, mockToday, true);
			const toast = useToastStore.getState().toast;
			expect(toast).toMatchObject({
				message: "Logged 'Read' · off-schedule",
				actionLabel: "Undo",
			});
			toast?.onAction?.();
			expect(mockRestoreDay).toHaveBeenLastCalledWith(
				5,
				mockToday,
				false,
				null,
			);
			expect(mockToggleCompletion).toHaveBeenCalledTimes(1);
			expect(mockRestoreDay).toHaveBeenCalledTimes(1);
			// The picker closed.
			await waitFor(() =>
				expect(screen.queryByText("Log off-schedule")).toBeNull(),
			);
		});

		it("hands a quantity habit off to the Quantity log, closes the picker, and Undo restores the prior amount", async () => {
			mockEligibleHabits = [water];
			mockQuantityValuesByHabitId = new Map();
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Log something anyway"));
			await fireEvent.press(
				screen.getByRole("button", {
					name: "Log Glass of water, set an amount",
				}),
			);

			expect(screen.queryByText("Log off-schedule")).toBeNull();
			await fireEvent.press(
				screen.getByLabelText("Increase Glass of water, glasses"),
			);
			await fireEvent.press(screen.getByText("Save 1 of 8"));

			expect(mockLogQuantity).toHaveBeenCalledWith(6, mockToday, 1, 8);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Logged 'Glass of water' · off-schedule");
			toast?.onAction?.();
			// Nothing was logged before, so Undo writes 0 — which deletes the entry.
			expect(mockRestoreDay).toHaveBeenLastCalledWith(6, mockToday, 0, null);
		});

		it("Undo after a quantity log restores the amount that was there before", async () => {
			mockEligibleHabits = [water];
			mockQuantityValuesByHabitId = new Map([[6, 2]]);
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Log something anyway"));
			await fireEvent.press(
				screen.getByRole("button", {
					name: "Log Glass of water, set an amount",
				}),
			);
			await fireEvent.press(
				screen.getByLabelText("Increase Glass of water, glasses"),
			);
			await fireEvent.press(screen.getByText("Save 3 of 8"));

			useToastStore.getState().toast?.onAction?.();
			expect(mockRestoreDay).toHaveBeenLastCalledWith(6, mockToday, 2, null);
		});

		it("lists what was logged today with its time, and a logged row in the picker does nothing", async () => {
			mockEligibleHabits = [read];
			mockLoggedToday = [
				{
					habit: read,
					entry: {
						id: 1,
						habitId: 5,
						date: "2026-09-16",
						createdAt: new Date(2026, 8, 16, 10, 42),
					},
				},
			];
			await render(<TodayScreen />);

			expect(screen.getByText("LOGGED TODAY · OFF-SCHEDULE")).toBeTruthy();
			expect(
				screen.getByText("Logged 10:42 · bonus, streak unchanged"),
			).toBeTruthy();

			await fireEvent.press(screen.getByText("Log something anyway"));
			await fireEvent.press(
				screen.getByRole("checkbox", { name: "Read, logged off-schedule" }),
			);
			expect(mockToggleCompletion).not.toHaveBeenCalled();
			expect(useToastStore.getState().toast).toBeNull();
		});
	});

	it("everything done is still the normal list at 100% — no day-closed screen", async () => {
		mockViewState = "populated";
		mockProgress = { completed: 1, total: 1, fraction: 1 };
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];
		mockCompletedHabitIds = new Set([1]);

		await render(<TodayScreen />);

		expect(screen.getByText("1 of 1 complete")).toBeTruthy();
		expect(screen.getByText("100%")).toBeTruthy();
		expect(screen.queryByText(/^All .* done$/)).toBeNull();
		expect(screen.queryByText("TOMORROW")).toBeNull();
		// Nothing conjures an Undo from an earlier visit's entries.
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
		expect(mockRestoreDay).toHaveBeenLastCalledWith(1, mockToday, false, null);
	});

	it("renders a neutral blank — not the empty state — until habits have loaded (A5-04)", async () => {
		mockIsLoaded = false;
		mockViewState = "no-habits";

		await render(<TodayScreen />);

		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		expect(screen.queryByText("Nothing to track yet")).toBeNull();
	});

	describe("failed and day-rollover writes", () => {
		beforeEach(() => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
		});

		it("a failed toggle shows no 'complete' toast (the hook already toasted the error)", async () => {
			mockToggleCompletion.mockResolvedValue({
				ok: false,
				error: new Error("disk"),
			});

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("Glass of water"));

			expect(useToastStore.getState().toast).toBeNull();
		});

		it("Undo targets the day of the original tap, not the day it is pressed on", async () => {
			jest.setSystemTime(new Date(2026, 8, 16, 23, 59, 0));
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("Glass of water"));
			expect(mockToggleCompletion).toHaveBeenCalledWith(1, mockToday, true);

			// Midnight passes before Undo is pressed.
			jest.setSystemTime(new Date(2026, 8, 17, 0, 1, 0));
			await act(async () => {
				await useToastStore.getState().toast?.onAction?.();
			});

			expect(mockRestoreDay).toHaveBeenLastCalledWith(
				1,
				new Date(2026, 8, 16),
				false,
				null,
			);
		});

		it("a tap on a render that still shows yesterday writes nothing", async () => {
			await render(<TodayScreen />);
			jest.setSystemTime(new Date(2026, 8, 17, 0, 0, 5));

			await fireEvent.press(screen.getByLabelText("Glass of water"));

			expect(mockToggleCompletion).not.toHaveBeenCalled();
			expect(useToastStore.getState().toast).toBeNull();
		});
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

	describe("un-ticking offers Undo (A5-06)", () => {
		const waterGroup = () => [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		beforeEach(() => {
			mockViewState = "populated";
			mockGroups = waterGroup();
			mockCompletedHabitIds = new Set([1]);
		});

		it("toasts the un-tick with an Undo that puts it back, on the day of the tap — not on whatever day it is by then", async () => {
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("Glass of water, done"));

			const toast = useToastStore.getState().toast;
			expect(toast).toMatchObject({
				message: "Marked 'Glass of water' not complete",
				actionLabel: "Undo",
			});

			// The app is left open past midnight before Undo is tapped.
			fakeDate(new Date(2026, 8, 17, 0, 5));
			toast?.onAction?.();
			expect(mockRestoreDay).toHaveBeenLastCalledWith(1, mockToday, true, null);
		});

		it("words a Break habit's un-tick as 'not resisted'", async () => {
			const breakHabit = makeHabit({
				id: 4,
				name: "No phone in bed",
				category: categoryNamed("Morning"),
				direction: "break",
			});
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [breakHabit] },
			];
			mockCompletedHabitIds = new Set([4]);

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("No phone in bed, resisted"));

			expect(useToastStore.getState().toast?.message).toBe(
				"Marked 'No phone in bed' not resisted",
			);
		});

		it("a newer un-tick replaces the toast — they never stack, and the old Undo is gone", async () => {
			const reading = makeHabit({
				id: 2,
				name: "Read",
				category: categoryNamed("Morning"),
			});
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit, reading] },
			];
			mockCompletedHabitIds = new Set([1, 2]);

			await render(
				<>
					<ToastHost />
					<TodayScreen />
				</>,
			);
			await fireEvent.press(screen.getByLabelText("Glass of water, done"));
			await fireEvent.press(screen.getByLabelText("Read, done"));

			expect(screen.getAllByText("Undo")).toHaveLength(1);
			expect(
				screen.queryByText("Marked 'Glass of water' not complete"),
			).toBeNull();
			expect(screen.getByText("Marked 'Read' not complete")).toBeTruthy();

			await fireEvent.press(screen.getByText("Undo"));
			expect(mockRestoreDay).toHaveBeenLastCalledWith(2, mockToday, true, null);
			expect(mockRestoreDay).not.toHaveBeenCalledWith(1, mockToday, true, null);
		});

		it("once the toast has expired Undo is gone, so nothing can be restored late", async () => {
			// This file fakes only Date; the toast's 4 s timer needs every timer.
			jest.useFakeTimers({ now: new Date(2026, 8, 16, 12) });
			await render(
				<>
					<ToastHost />
					<TodayScreen />
				</>,
			);
			await fireEvent.press(screen.getByLabelText("Glass of water, done"));
			expect(screen.getByText("Undo")).toBeTruthy();
			mockToggleCompletion.mockClear();

			await act(() => jest.advanceTimersByTime(TOAST_DURATION_MS));

			expect(screen.queryByText("Undo")).toBeNull();
			expect(useToastStore.getState().toast).toBeNull();
			expect(mockToggleCompletion).not.toHaveBeenCalled();
		});

		it("a failed un-tick shows no Undo (the error toast is the hook's)", async () => {
			mockToggleCompletion.mockResolvedValue({ ok: false });
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("Glass of water, done"));
			expect(useToastStore.getState().toast).toBeNull();
		});

		it("dropping a quantity habit back under its target offers Undo, restoring the exact previous amount", async () => {
			const water = makeHabit({
				id: 3,
				name: "Glass of water",
				category: categoryNamed("Morning"),
				targetType: "quantity",
				targetAmount: 8,
				targetUnit: "glasses",
			});
			mockGroups = [{ category: categoryNamed("Morning"), habits: [water] }];
			mockCompletedHabitIds = new Set([3]);
			mockQuantityValuesByHabitId = new Map([[3, 10]]);

			await render(<TodayScreen />);
			await fireEvent(
				screen.getByLabelText("Add one to Glass of water, 10 of 8 glasses"),
				"longPress",
			);
			for (let i = 0; i < 7; i += 1) {
				await fireEvent.press(
					screen.getByLabelText("Decrease Glass of water, glasses"),
				);
			}
			await fireEvent.press(screen.getByText("Save 3 of 8"));

			expect(mockLogQuantity).toHaveBeenCalledWith(3, mockToday, 3, 8);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Marked 'Glass of water' not complete");
			toast?.onAction?.();
			expect(mockRestoreDay).toHaveBeenLastCalledWith(3, mockToday, 10, null);
		});

		it("a quantity save that stays complete (or stays short) offers nothing", async () => {
			const water = makeHabit({
				id: 3,
				name: "Glass of water",
				category: categoryNamed("Morning"),
				targetType: "quantity",
				targetAmount: 8,
				targetUnit: "glasses",
			});
			mockGroups = [{ category: categoryNamed("Morning"), habits: [water] }];
			mockCompletedHabitIds = new Set([3]);
			mockQuantityValuesByHabitId = new Map([[3, 10]]);

			await render(<TodayScreen />);
			await fireEvent(
				screen.getByLabelText("Add one to Glass of water, 10 of 8 glasses"),
				"longPress",
			);
			await fireEvent.press(
				screen.getByLabelText("Decrease Glass of water, glasses"),
			);
			await fireEvent.press(screen.getByText("Save 9 of 8"));

			expect(mockLogQuantity).toHaveBeenCalledWith(3, mockToday, 9, 8);
			expect(useToastStore.getState().toast).toBeNull();
		});
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

		expect(mockPush).toHaveBeenCalledWith("/habit/1");
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

	it("long-pressing a quantity habit's circle opens the Quantity Log sheet instead of toggling", async () => {
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
		await fireEvent(
			screen.getByLabelText("Add one to Glass of water, 3 of 8 glasses"),
			"longPress",
		);

		expect(screen.getByText("Save 3 of 8")).toBeTruthy();
		expect(mockToggleCompletion).not.toHaveBeenCalled();
	});

	it("tapping a quantity habit's circle adds one, with an Undo to the amount before", async () => {
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
		mockQuantityValuesByHabitId = new Map([[3, 2]]);

		await render(<TodayScreen />);
		await fireEvent.press(
			screen.getByLabelText("Add one to Glass of water, 2 of 8 glasses"),
		);

		expect(mockLogQuantity).toHaveBeenCalledWith(3, mockToday, 3, 8);
		expect(screen.queryByText("Save 3 of 8")).toBeNull();
		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Glass of water +1 · 3 of 8 glasses");
		toast?.onAction?.();
		expect(mockRestoreDay).toHaveBeenLastCalledWith(3, mockToday, 2, null);
	});

	it("the count control opens the Quantity Log sheet", async () => {
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
		await fireEvent.press(screen.getByText("3/8"));

		expect(screen.getByText("Save 3 of 8")).toBeTruthy();
		expect(mockLogQuantity).not.toHaveBeenCalled();
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
		mockLogQuantity.mockResolvedValue(OK);

		await render(<TodayScreen />);
		await fireEvent(
			screen.getByLabelText("Add one to Glass of water, 3 of 8 glasses"),
			"longPress",
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		await fireEvent.press(screen.getByText("Save 4 of 8"));

		expect(mockLogQuantity).toHaveBeenCalledWith(3, mockToday, 4, 8);
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
		mockLogQuantity.mockResolvedValue(OK);

		await render(<TodayScreen />);
		await fireEvent(
			screen.getByLabelText("Add one to Glass of water, 7 of 8 glasses"),
			"longPress",
		);
		await fireEvent.press(
			screen.getByLabelText("Increase Glass of water, glasses"),
		);
		await fireEvent.press(screen.getByText("Save 8 of 8"));

		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Marked 'Glass of water' complete");
		toast?.onAction?.();
		expect(mockRestoreDay).toHaveBeenLastCalledWith(3, mockToday, 7, null);
	});

	it("adds a habit from the header + once habits exist, with no ghost link under the list", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		await render(<TodayScreen />);
		expect(screen.queryByText("Add habit")).toBeNull();
		await fireEvent.press(screen.getByRole("button", { name: "Add habit" }));

		expect(mockPush).toHaveBeenCalledWith("/new-habit");
	});

	describe("header (HAB-27)", () => {
		const states = ["no-habits", "rest-day", "populated"] as const;

		beforeEach(() => {
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
		});

		it.each(states)("offers the header + in the %s state", async (state) => {
			mockViewState = state;
			await render(<TodayScreen />);
			// By testID, not label: the empty state also has an "Add habit" button.
			await fireEvent.press(screen.getByTestId("header-circle-plus"));
			expect(mockPush).toHaveBeenCalledWith("/new-habit");
		});

		// The ⋯ menu is gone (D2): summaries live on the Progress tab, Manage and
		// Settings on the Habits tab.
		it.each(states)("has no ⋯ menu in the %s state", async (state) => {
			mockViewState = state;
			await render(<TodayScreen />);
			expect(
				screen.queryByLabelText("More", { includeHiddenElements: true }),
			).toBeNull();
			for (const title of [
				"Weekly summary",
				"Monthly",
				"Yearly",
				"Manage & archive",
				"Settings",
			]) {
				expect(screen.queryByText(title)).toBeNull();
			}
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
			expect(screen.getByText("Keep your Glass of water streak?")).toBeTruthy();
			expect(
				screen.getByText(
					"You missed yesterday. Use a freeze to keep your 24-day streak, or let it go: it restarts with your next log.",
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

			expect(mockPush).toHaveBeenCalledWith("/habit/1");
		});

		it("Use a freeze applies it for the missed date and closes the sheet", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			const missedDate = new Date("2026-09-15");
			mockAtRiskByHabitId = new Map([[1, { missedDate, currentStreak: 24 }]]);
			mockApplyFreeze.mockResolvedValue({
				ok: true,
				value: { freezesLeft: 1 },
			});

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Glass of water"));
			await fireEvent.press(screen.getByText("Use a freeze"));

			expect(mockApplyFreeze).toHaveBeenCalledWith(1, missedDate);
			await waitFor(() =>
				expect(
					screen.queryByText("Keep your Glass of water streak?"),
				).toBeNull(),
			);
		});

		it("Use a freeze confirms with a toast whose Undo takes it back for that same missed day", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			const missedDate = new Date("2026-09-15");
			mockAtRiskByHabitId = new Map([[1, { missedDate, currentStreak: 24 }]]);

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Glass of water"));
			await fireEvent.press(screen.getByText("Use a freeze"));

			const toast = useToastStore.getState().toast;
			expect(toast).toMatchObject({
				message: `Freeze used for ${format(missedDate, "EEE d")} · 1 left`,
				actionLabel: "Undo",
			});
			toast?.onAction?.();
			expect(mockUndoFreeze).toHaveBeenCalledWith(1, missedDate);
		});

		it("a failed freeze leaves the sheet open and shows no Undo", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			mockAtRiskByHabitId = new Map([
				[1, { missedDate: new Date("2026-09-15"), currentStreak: 24 }],
			]);
			mockApplyFreeze.mockResolvedValue({ ok: false });

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Glass of water"));
			await fireEvent.press(screen.getByText("Use a freeze"));

			expect(useToastStore.getState().toast).toBeNull();
			expect(screen.getByText("Keep your Glass of water streak?")).toBeTruthy();
		});

		it("Not now closes the sheet without calling applyFreeze", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			mockAtRiskByHabitId = new Map([
				[1, { missedDate: new Date("2026-09-15"), currentStreak: 24 }],
			]);

			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Glass of water"));
			await fireEvent.press(screen.getByText("Not now"));

			expect(mockApplyFreeze).not.toHaveBeenCalled();
			expect(screen.queryByText("Keep your Glass of water streak?")).toBeNull();
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
