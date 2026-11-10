import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { jumpAnimationsToTheirEnd } from "@/test-support/animation";
import { expectConsole } from "@/test-support/console";
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
let mockStreakByHabitId = new Map<number, number>();
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

let mockQueriesError: Error | null = null;
jest.mock("../hooks/use-today-queries", () => ({
	useTodayQueries: () => {
		if (mockQueriesError) throw mockQueriesError;
		return {
			groups: mockGroups,
			progress: mockProgress,
			completedHabitIds: mockCompletedHabitIds,
			quantityValuesByHabitId: mockQuantityValuesByHabitId,
			completedThisWeekByHabitId: mockCompletedThisWeekByHabitId,
			streakByHabitId: mockStreakByHabitId,
			frozenYesterdayByHabitId: new Map(),
			today: mockToday,
			selectedDay: mockToday,
			isLoaded: mockIsLoaded,
			viewState: mockViewState,
			// The hook adds the missed day's pool to each; the tests set one number.
			atRiskByHabitId: new Map(
				[...mockAtRiskByHabitId].map(([id, atRisk]) => [
					id,
					{ freezesRemaining: mockFreezesRemainingThisMonth, ...atRisk },
				]),
			),
			freezesRemainingThisMonth: mockFreezesRemainingThisMonth,
		};
	},
}));

jest.mock("../hooks/use-week-strip-queries", () => ({
	useWeekStripQueries: () => ({
		days: Array.from({ length: 7 }, (_, index) => {
			const date = new Date(2026, 8, 14 + index);
			return {
				date,
				key: `2026-09-${14 + index}`,
				isToday: index === 2,
				isFuture: index > 2,
				allDone: false,
			};
		}),
		canShowNext: false,
		direction: 0,
		showPreviousWeek: jest.fn(),
		showNextWeek: jest.fn(),
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

// The quantity sheet reads its own day's entry: serve the shown amounts for whichever day it asks.
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: (start: Date) =>
		[...mockQuantityValuesByHabitId].map(([habitId, value]) => ({
			habitId,
			value,
			date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
		})),
}));
let mockRollover: {
	day: Date;
	summary: { completed: number; total: number };
} | null = null;
const mockDismissRollover = jest.fn();
jest.mock("../hooks/use-rollover-queries", () => ({
	useRolloverQueries: () => ({
		notice: mockRollover,
		dismiss: mockDismissRollover,
	}),
}));
// The first-run reminder pre-prompt has its own tests; here it only has to stay out of the way.
jest.mock("../components/first-run/first-run-reminder-offer", () => ({
	FirstRunReminderOffer: () => null,
}));

// jest's window reports fontScale 2: without this the strip is the one-day AX stand-in.
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));

// Counts the strip's mounts: a remount is what would drop its position and the
// list's scroll offset along with it.
let mockStripMounts = 0;
let mockStripUnmounts = 0;
jest.mock("../components/week-strip", () => {
	const { useEffect } = require("react");
	const actual = jest.requireActual("../components/week-strip");
	return {
		WeekStrip: (props: unknown) => {
			useEffect(() => {
				mockStripMounts += 1;
				return () => {
					mockStripUnmounts += 1;
				};
			}, []);
			return <actual.WeekStrip {...(props as object)} />;
		},
	};
});

import { Animated } from "react-native";
import { ToastHost } from "@/components/ui/composite/toast-host";
import { useToastStore } from "@/store/toast-store";
import { motion } from "@/theme/theme";
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
		jumpAnimationsToTheirEnd();
		measureSpy = mockMeasureInWindow();
		mockIsLoaded = true;
		mockQueriesError = null;
		mockRollover = null;
		mockDismissRollover.mockReset();
		mockPush.mockReset();
		mockToggleCompletion.mockReset().mockResolvedValue(OK);
		mockRestoreDay
			.mockReset()
			.mockResolvedValue({ ok: true, value: undefined });
		mockLogQuantity.mockReset().mockResolvedValue(OK);
		mockApplyFreeze
			.mockReset()
			.mockResolvedValue({ ok: true, value: { freezesLeft: 1 } });
		mockUndoFreeze.mockReset().mockResolvedValue(OK);
		mockGroups = [];
		mockProgress = { completed: 0, total: 0, fraction: 0 };
		mockCompletedHabitIds = new Set();
		mockQuantityValuesByHabitId = new Map();
		mockStreakByHabitId = new Map();
		mockCompletedThisWeekByHabitId = new Map();
		mockViewState = "no-habits";
		useToastStore.setState({ toast: null });
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
				"Add a habit and it shows up here on every day it’s due.",
			),
		).toBeTruthy();
	});

	it("offers Browse suggestions in the empty state, and it opens the suggestions screen", async () => {
		await render(<TodayScreen />);
		await fireEvent.press(screen.getByText("Browse suggestions"));
		expect(mockPush).toHaveBeenCalledWith("/suggestions");
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
			screen.getByText(/Nothing is due today, so every streak is safe/),
		).toBeTruthy();
		expect(screen.queryByText("Nothing to track yet")).toBeNull();
	});

	describe("rest day: Log something anyway", () => {
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
			await fireEvent.press(screen.getByText("Log a different habit"));

			expect(screen.getByText("Log off-schedule")).toBeTruthy();
			// Once on the rest-day card, once in the picker.
			expect(screen.getAllByText("Read")).toHaveLength(2);
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("shows the 'nothing eligible' state when no habit can be logged", async () => {
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Log a different habit"));
			expect(screen.getByText("Nothing to log here")).toBeTruthy();
		});

		it("logs a check habit, confirms with a toast, and Undo removes exactly that entry", async () => {
			mockEligibleHabits = [read];
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Log a different habit"));
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
			await waitFor(() =>
				expect(screen.queryByText("Log off-schedule")).toBeNull(),
			);
		});

		it("hands a quantity habit off to the quantity sheet, closes the picker, and Undo restores the prior amount", async () => {
			mockEligibleHabits = [water];
			mockQuantityValuesByHabitId = new Map([[6, 2]]);
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Log a different habit"));
			await fireEvent.press(
				screen.getByRole("button", {
					name: "Log Glass of water, set an amount",
				}),
			);

			expect(screen.queryByText("Log off-schedule")).toBeNull();
			await fireEvent.press(screen.getByLabelText("Increase glasses"));
			await act(async () => {
				await fireEvent.press(screen.getByText("Close"));
			});

			expect(mockLogQuantity).toHaveBeenCalledWith(6, mockToday, 3, 8);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Logged 'Glass of water' · off-schedule");
			toast?.onAction?.();
			expect(mockRestoreDay).toHaveBeenLastCalledWith(6, mockToday, 2, null);
		});

		it("shows a bonus already logged today as logged, and a logged row in the picker does nothing", async () => {
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

			expect(screen.getByText("Bonus · streak unchanged")).toBeTruthy();

			await fireEvent.press(screen.getByText("Log a different habit"));
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

		expect(screen.getByText("1 of 1 done")).toBeTruthy();
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

		expect(screen.getByText("MORNING")).toBeTruthy();
		expect(screen.getByText("1 of 1")).toBeTruthy();
		expect(screen.getByText("EVENING")).toBeTruthy();
		expect(screen.getByText("0 of 1")).toBeTruthy();
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

		expect(screen.getByText("1 of 2 done")).toBeTruthy();
		expect(screen.getByText("50%")).toBeTruthy();
	});

	it("tapping a row's completion circle toggles it for today", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("Glass of water, not done"));

		expect(mockToggleCompletion).toHaveBeenCalledWith(1, mockToday, true);
	});

	it("completing confirms with an Undo toast that reverses it", async () => {
		mockViewState = "populated";
		mockGroups = [
			{ category: categoryNamed("Morning"), habits: [morningHabit] },
		];

		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("Glass of water, not done"));

		const toast = useToastStore.getState().toast;
		expect(toast).toMatchObject({
			message: "Marked 'Glass of water' complete",
			actionLabel: "Undo",
		});
		toast?.onAction?.();
		expect(mockRestoreDay).toHaveBeenLastCalledWith(1, mockToday, false, null);
	});

	it("renders a neutral blank, not the empty state, until habits have loaded", async () => {
		mockIsLoaded = false;
		mockViewState = "no-habits";

		await render(<TodayScreen />);

		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		expect(screen.queryByText("Nothing to track yet")).toBeNull();
	});

	describe("loading (SY1)", () => {
		beforeEach(() => {
			mockIsLoaded = false;
			mockViewState = "no-habits";
			jest.useFakeTimers();
			// The skeleton pulses in a loop; a jumped animation would restart forever.
			jest.mocked(Animated.timing).mockRestore();
		});
		afterEach(() => jest.useRealTimers());

		it("shows the real header at once, and neither the week strip nor the empty state", async () => {
			await render(<TodayScreen />);
			expect(screen.getByText("Today")).toBeTruthy();
			expect(screen.getByLabelText("Add habit")).toBeTruthy();
			expect(screen.queryByTestId("week-strip")).toBeNull();
			expect(screen.queryByText("Nothing to track yet")).toBeNull();
		});

		it("draws no skeleton before 300 ms, so a fast load never flashes one", async () => {
			await render(<TodayScreen />);
			await act(() => jest.advanceTimersByTime(299));
			expect(
				screen.queryByTestId("today-skeleton", { includeHiddenElements: true }),
			).toBeNull();
		});

		it("draws the skeleton once the wait reaches 300 ms", async () => {
			await render(<TodayScreen />);
			await act(() => jest.advanceTimersByTime(300));
			expect(
				screen.getByTestId("today-skeleton", { includeHiddenElements: true }),
			).toBeTruthy();
		});

		it("never draws the skeleton when the habits arrive in time", async () => {
			const view = await render(<TodayScreen />);
			await act(() => jest.advanceTimersByTime(200));
			mockIsLoaded = true;
			await view.rerender(<TodayScreen />);
			await act(() => jest.advanceTimersByTime(1000));
			expect(
				screen.queryByTestId("today-skeleton", { includeHiddenElements: true }),
			).toBeNull();
			expect(screen.getByText("Nothing to track yet")).toBeTruthy();
		});
	});

	describe("midnight rollover (SY5)", () => {
		it("shows nothing until the day rolls over", async () => {
			await render(<TodayScreen />);
			expect(screen.queryByText(/closed at midnight/)).toBeNull();
		});

		it("shows the banner under the header and dismisses it", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			mockRollover = {
				day: new Date(2026, 8, 15),
				summary: { completed: 4, total: 5 },
			};
			await render(<TodayScreen />);
			expect(
				screen.getByText(/Tuesday closed at midnight with 4 of 5 done/),
			).toBeTruthy();
			expect(screen.getByText("Glass of water")).toBeTruthy();
			await fireEvent.press(screen.getByText("Dismiss"));
			expect(mockDismissRollover).toHaveBeenCalledTimes(1);
		});
	});

	describe("a load error stays inside Today (SY2)", () => {
		beforeEach(() => {
			mockQueriesError = new Error("query failed");
			expectConsole("error");
		});
		afterEach(() => jest.restoreAllMocks());

		it("keeps the header and offers Try again and Copy diagnostics, with the data-is-safe line", async () => {
			await render(<TodayScreen />);
			expect(screen.getByTestId("today-load-error")).toBeTruthy();
			expect(screen.getByText("Today")).toBeTruthy();
			expect(screen.getByText("Couldn\u2019t load your habits")).toBeTruthy();
			expect(
				screen.getByText("Your data is safe. Trying again usually fixes this."),
			).toBeTruthy();
			expect(screen.getByText("Try again")).toBeTruthy();
			expect(screen.getByText("Copy diagnostics")).toBeTruthy();
		});

		it("the + still adds a habit", async () => {
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByLabelText("Add habit"));
			expect(mockPush).toHaveBeenCalledWith("/new-habit");
		});

		it("Try again runs the read again, and Today comes back when it works", async () => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [morningHabit] },
			];
			await render(<TodayScreen />);
			mockQueriesError = null;
			await fireEvent.press(screen.getByText("Try again"));
			expect(screen.queryByTestId("today-load-error")).toBeNull();
			expect(screen.getByText("Glass of water")).toBeTruthy();
		});

		it("Try again that fails again shows the same state", async () => {
			await render(<TodayScreen />);
			await fireEvent.press(screen.getByText("Try again"));
			expect(screen.getByTestId("today-load-error")).toBeTruthy();
		});
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
			await fireEvent.press(screen.getByLabelText("Glass of water, not done"));

			expect(useToastStore.getState().toast).toBeNull();
		});
	});

	it("confirms a Break habit as resisted, never as complete", async () => {
		const breakHabit = makeHabit({
			id: 7,
			name: "No phone in bed",
			category: categoryNamed("Morning"),
			direction: "break",
		});
		mockViewState = "populated";
		mockGroups = [{ category: categoryNamed("Morning"), habits: [breakHabit] }];

		await render(<TodayScreen />);
		await fireEvent.press(
			screen.getByLabelText("No phone in bed, resisted today?"),
		);

		expect(useToastStore.getState().toast?.message).toBe(
			"Resisted 'No phone in bed'",
		);
	});

	describe("a Break habit's circle at the evening hour (EVENING_STARTS_AT_HOUR)", () => {
		const noSocial = () =>
			makeHabit({
				id: 7,
				name: "No social media",
				category: categoryNamed("Morning"),
				direction: "break",
			});

		beforeEach(() => {
			mockViewState = "populated";
			mockGroups = [
				{ category: categoryNamed("Morning"), habits: [noSocial()] },
			];
		});
		afterEach(() => jest.useRealTimers());

		// The 18:00 rule only words the status line ("Resist tonight"); the circle logs at any hour.
		it.each([
			["15:30", new Date(2026, 8, 16, 15, 30), "Resisting"],
			["17:59", new Date(2026, 8, 16, 17, 59), "Resisting"],
			["18:00", new Date(2026, 8, 16, 18, 0), "Resist tonight"],
		])(
			"at %s the circle logs and confirms; the line reads %s",
			async (_time, now, line) => {
				fakeDate(now);
				await render(<TodayScreen />);
				expect(screen.getByText(new RegExp(`^${line}`))).toBeTruthy();
				await fireEvent.press(
					screen.getByLabelText("No social media, resisted today?"),
				);
				expect(mockToggleCompletion).toHaveBeenCalledWith(
					7,
					expect.any(Date),
					true,
				);
				expect(useToastStore.getState().toast?.message).toBe(
					"Resisted 'No social media'",
				);
			},
		);
	});

	describe("un-ticking offers Undo", () => {
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

			await act(() =>
				jest.advanceTimersByTime(motion.toast.hold.undo + motion.toast.out),
			);

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
				screen.getByLabelText("Add one, Glass of water, 10 of 8"),
				"longPress",
			);
			for (let i = 0; i < 7; i += 1) {
				await fireEvent.press(screen.getByLabelText("Decrease glasses"));
			}
			await act(async () => {
				await fireEvent.press(screen.getByText("Close"));
			});

			expect(mockLogQuantity).toHaveBeenLastCalledWith(3, mockToday, 3, 8);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Marked 'Glass of water' not complete");
			toast?.onAction?.();
			expect(mockRestoreDay).toHaveBeenLastCalledWith(3, mockToday, 10, null);
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

	it("puts the amount or the weekly standing in the status line, and nothing under a plain daily check", async () => {
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

		expect(screen.getByText("0 of 20 pages")).toBeTruthy();
		expect(screen.getByText("3× per week · 2 done")).toBeTruthy();
		// A plain daily check has nothing to add under its name.
		expect(screen.queryByText(/daily/i)).toBeNull();
	});

	function quantityRow(value: number) {
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
		mockQuantityValuesByHabitId = new Map([[3, value]]);
	}

	it("long-pressing a quantity habit's circle opens the quantity sheet instead of toggling", async () => {
		quantityRow(3);
		await render(<TodayScreen />);
		await fireEvent(
			screen.getByLabelText("Add one, Glass of water, 3 of 8"),
			"longPress",
		);

		expect(screen.getByLabelText("glasses").props.accessibilityValue.now).toBe(
			3,
		);
		expect(mockToggleCompletion).not.toHaveBeenCalled();
	});

	it("tapping a quantity habit's circle adds one, with an Undo to the amount before", async () => {
		quantityRow(2);
		await render(<TodayScreen />);
		await fireEvent.press(
			screen.getByLabelText("Add one, Glass of water, 2 of 8"),
		);

		expect(mockLogQuantity).toHaveBeenCalledWith(3, mockToday, 3, 8);
		expect(screen.queryByLabelText("glasses")).toBeNull();
		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Glass of water +1 · 3 of 8 glasses");
		toast?.onAction?.();
		expect(mockRestoreDay).toHaveBeenLastCalledWith(3, mockToday, 2, null);
	});

	it("the count button opens the quantity sheet and saves nothing by itself", async () => {
		quantityRow(3);
		await render(<TodayScreen />);
		await fireEvent.press(screen.getByLabelText("Amount, 3 of 8"));

		expect(screen.getByLabelText("glasses")).toBeTruthy();
		expect(mockLogQuantity).not.toHaveBeenCalled();
	});

	it("a change in the sheet saves at once, and closing with the target reached confirms it; Undo restores the amount from before", async () => {
		quantityRow(7);
		await render(<TodayScreen />);
		await fireEvent(
			screen.getByLabelText("Add one, Glass of water, 7 of 8"),
			"longPress",
		);
		await fireEvent.press(screen.getByLabelText("Increase glasses"));
		expect(mockLogQuantity).toHaveBeenCalledWith(3, mockToday, 8, 8);
		await act(async () => {
			await fireEvent.press(screen.getByText("Done"));
		});

		await waitFor(() => expect(screen.queryByLabelText("glasses")).toBeNull());
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

	describe("header", () => {
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

	describe("streak-at-risk", () => {
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
	});
});

describe("TodayScreen day tap", () => {
	async function scrollTo(y: number) {
		await fireEvent.scroll(screen.getByTestId("today-scroll"), {
			nativeEvent: { contentOffset: { y } },
		});
	}

	/** The inline bar is always mounted; it is "showing" once VoiceOver can reach its name. */
	const barShowing = () =>
		screen.queryByRole("header", { name: "Today" }) !== null;

	beforeEach(() => {
		mockStripMounts = 0;
		mockStripUnmounts = 0;
		mockViewState = "populated";
		mockGroups = [
			{ category: morningHabit.category, habits: [morningHabit] },
			{ category: eveningHabit.category, habits: [eveningHabit] },
		] as CategoryGroup[];
		mockProgress = { completed: 0, total: 2, fraction: 0 };
	});

	it("keeps the strip mounted, shows the bar and leaves the title alone when a past day is chosen", async () => {
		await render(<TodayScreen />);
		await scrollTo(10);

		await fireEvent.press(screen.getByTestId("week-strip-day-2026-09-14"));

		expect(screen.getByTestId("past-day-bar")).toBeTruthy();
		expect(screen.getByTestId("week-strip")).toBeTruthy();
		expect(mockStripMounts).toBe(1);
		expect(mockStripUnmounts).toBe(0);
		expect(screen.queryByTestId("screen-loading")).toBeNull();
		expect(barShowing()).toBe(false);
	});

	it("does not collapse the title when the scroll is still inside the title's range", async () => {
		await render(<TodayScreen />);
		await scrollTo(10);
		await fireEvent.press(screen.getByTestId("week-strip-day-2026-09-14"));
		await scrollTo(10);

		expect(barShowing()).toBe(false);
	});

	it("'Show today' leaves the strip mounted and the collapse state as the scroll left it", async () => {
		await render(<TodayScreen />);
		await fireEvent.press(screen.getByTestId("week-strip-day-2026-09-14"));
		await scrollTo(10);

		await fireEvent.press(screen.getByText("Show today"));

		expect(screen.getByTestId("week-strip")).toBeTruthy();
		expect(mockStripMounts).toBe(1);
		expect(mockStripUnmounts).toBe(0);
		expect(barShowing()).toBe(false);
	});

	it("collapses the title only because the list scrolled, never because a day was chosen", async () => {
		await render(<TodayScreen />);
		await scrollTo(200);
		await waitFor(() => expect(barShowing()).toBe(true));

		await scrollTo(0);
		await fireEvent.press(screen.getByTestId("week-strip-day-2026-09-14"));
		expect(barShowing()).toBe(false);
	});
});
