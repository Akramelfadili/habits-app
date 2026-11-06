import {
	act,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import type { HabitDetail } from "../hooks/use-habit-detail-queries";
import type { RetroLogDay } from "../hooks/use-retro-log-queries";
import { builtInCategory, makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockScreenOptions = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, back: mockBack }),
	Stack: {
		Screen: ({ options }: { options?: object }) => {
			mockScreenOptions(options);
			return null;
		},
	},
}));

const OK = { ok: true, value: undefined } as const;
const mockArchive = jest.fn();
const mockDelete = jest.fn();
const mockRestore = jest.fn();
const mockUndoRestore = jest.fn();
let mockActionState = {
	isArchiving: false,
	isDeleting: false,
	deleteFailed: false,
};
jest.mock("../hooks/use-habit-detail-actions", () => ({
	useHabitDetailActions: () => ({
		archiveHabit: mockArchive,
		deleteHabit: mockDelete,
		restoreHabit: mockRestore,
		undoRestoreHabit: mockUndoRestore,
		isRestoring: false,
		clearDeleteFailure: jest.fn(),
		...mockActionState,
	}),
}));

const today = new Date(2026, 9, 23, 9);
let mockDetail: HabitDetail | null | undefined = null;
jest.mock("../hooks/use-habit-detail-queries", () => ({
	useHabitDetailQueries: () => mockDetail,
}));

const mockRetroLogQueries = jest.fn();
jest.mock("../hooks/use-retro-log-queries", () => ({
	useRetroLogQueries: (habitId: number, date: Date | null) =>
		mockRetroLogQueries(habitId, date),
}));
jest.mock("../hooks/use-day-note-actions", () => ({
	useDayNoteActions: () => ({ saveNote: jest.fn(), isSavingNote: false }),
}));
jest.mock("../hooks/use-today-actions", () => ({
	useTodayActions: () => ({
		toggleCompletion: jest.fn(),
		restoreDay: jest.fn(),
	}),
}));
jest.mock("../hooks/use-quantity-log-actions", () => ({
	useQuantityLogActions: () => ({ logQuantity: jest.fn() }),
}));

import { useToastStore } from "@/store/toast-store";
import { buildHeatmapWeeks } from "../domain/habit-history";
import { HabitDetailScreen } from "./habit-detail-screen";

const upper = makeHabit({
	id: 1,
	name: "Upper body",
	category: builtInCategory("Fitness"),
	frequency: { type: "weekdays", days: [2, 4] },
	createdAt: new Date(2026, 2, 2),
});

function detail(
	overrides: Partial<HabitDetail> = {},
	habit = upper,
): HabitDetail {
	return {
		habit,
		currentStreak: 9,
		longestStreak: { days: 14, endedOn: new Date(2026, 9, 1) },
		completionRate: {
			completed: 80,
			scheduled: 90,
			frozen: 1,
			fraction: 80 / 90,
			skippedPaused: false,
		},
		rateDelta: 4,
		heatmapWeeks: buildHeatmapWeeks({
			habit,
			entries: [],
			frozenDates: new Set(),
			today,
		}),
		history: [
			{ date: "2026-10-22", kind: "done", value: null, note: null },
			{ date: "2026-10-19", kind: "bonus", value: null, note: null },
			{ date: "2026-10-15", kind: "frozen", value: null, note: null },
			{ date: "2026-10-06", kind: "missed", value: null, note: null },
		],
		hasEntries: true,
		logCount: 214,
		reminders: [
			{
				id: 1,
				habitId: 1,
				hour: 7,
				minute: 0,
				weekdays: [2, 4],
				enabled: true,
			},
		],
		freezesRemaining: 1,
		streakReset: null,
		restoredToday: false,
		freshStart: false,
		today,
		...overrides,
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	useToastStore.setState({ toast: null });
	mockActionState = {
		isArchiving: false,
		isDeleting: false,
		deleteFailed: false,
	};
	mockArchive.mockResolvedValue(OK);
	mockDelete.mockResolvedValue(OK);
	mockRestore.mockResolvedValue(OK);
	mockUndoRestore.mockResolvedValue(OK);
	mockRetroLogQueries.mockImplementation(
		(_habitId: number, date: Date | null): RetroLogDay | null =>
			date
				? {
						date,
						habits: [upper],
						values: { 1: 0 },
						frozenHabitIds: new Set<number>(),
						originHabitId: 1,
						note: "",
					}
				: null,
	);
	mockDetail = detail();
});

describe("loading and not found", () => {
	it("renders a neutral blank, not 'not found', until the habit loads (A5-04)", async () => {
		mockDetail = undefined;
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		expect(screen.queryByText("Habit not found")).toBeNull();
	});

	it("says so when the habit does not exist", async () => {
		mockDetail = null;
		await render(<HabitDetailScreen habitId={99} />);
		expect(screen.getByText("Habit not found")).toBeTruthy();
	});
});

describe("D1 — the default Detail", () => {
	it("heads it with the category and cadence, the name and Edit", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByText("FITNESS · TUE, THU")).toBeTruthy();
		expect(screen.getByText("Upper body")).toBeTruthy();
		expect(
			screen.getByLabelText("Upper body. Fitness, Tuesday and Thursday."),
		).toBeTruthy();
		await fireEvent.press(screen.getByRole("button", { name: "Edit" }));
		expect(mockPush).toHaveBeenCalledWith("/edit-habit/1");
	});

	it("shows the three tiles: streak, longest and the 90-day rate with its change", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByLabelText("Streak: 9, in a row")).toBeTruthy();
		expect(screen.getByLabelText("Longest: 14, days")).toBeTruthy();
		expect(screen.getByLabelText("90-day rate: 89%, +4 pts")).toBeTruthy();
	});

	it("draws the last five weeks: five rows, each one target", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByText("Last 5 weeks")).toBeTruthy();
		expect(screen.getByText("Tue, Thu")).toBeTruthy();
		const weeks = screen.getAllByLabelText(/^Week of /);
		expect(weeks).toHaveLength(5);
	});

	it("a week row opens Edit this day for that week", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		const weeks = screen.getAllByRole("button", { name: /^Week of / });
		await fireEvent.press(weeks[weeks.length - 1]);
		expect(mockRetroLogQueries).toHaveBeenLastCalledWith(1, expect.any(Date));
		expect(screen.getByText("Thursday, 22 October")).toBeTruthy();
	});

	it("lists Reminders with the time and days, and opens them", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByText("07:00 · Tue, Thu")).toBeTruthy();
		await fireEvent.press(
			screen.getByRole("button", {
				name: "Reminders, 07:00, Tuesday and Thursday",
			}),
		);
		expect(mockPush).toHaveBeenCalledWith("/reminders/1");
	});

	it("lists the history by date, with a Bonus tagged 'not counted' and no times (D2)", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByText("Thu 22 Oct")).toBeTruthy();
		expect(screen.getByText("Done · off-schedule, not counted")).toBeTruthy();
		expect(screen.getByText("Bonus")).toBeTruthy();
		expect(screen.getByText("Frozen · streak kept")).toBeTruthy();
		expect(screen.getAllByText("Missed").length).toBeGreaterThan(0);
		expect(screen.queryByText(/\d\d:\d\d\b(?! ·)/)).toBeNull();
	});

	it("ends with Archive habit then Delete habit", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		const labels = screen
			.getAllByText(/^(History|Archive habit|Delete habit)$/i)
			.map((node) => node.props.children);
		expect(labels.at(-2)).toBe("Archive habit");
		expect(labels.at(-1)).toBe("Delete habit");
	});

	it("puts the habit's name in the bar once the title scrolls away", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		expect(mockScreenOptions).toHaveBeenLastCalledWith({ title: "" });
		await fireEvent.scroll(screen.getByTestId("habit-detail-scroll"), {
			nativeEvent: { contentOffset: { y: 200 } },
		});
		expect(mockScreenOptions).toHaveBeenLastCalledWith({ title: "Upper body" });
	});
});

describe("D3 — a new habit", () => {
	it("says when each tile starts, shows the grid before start and how to begin", async () => {
		const fresh = makeHabit({
			id: 1,
			name: "Drink water",
			category: builtInCategory("Health"),
			createdAt: today,
		});
		mockDetail = detail(
			{
				currentStreak: 0,
				longestStreak: { days: 0, endedOn: null },
				completionRate: {
					completed: 0,
					scheduled: 0,
					frozen: 0,
					fraction: null,
					skippedPaused: false,
				},
				rateDelta: null,
				hasEntries: false,
				logCount: 0,
				history: [],
				reminders: [],
			},
			fresh,
		);
		await render(<HabitDetailScreen habitId={1} />);
		expect(
			screen.getByLabelText("Streak: 0, starts with your first log"),
		).toBeTruthy();
		expect(screen.getByLabelText("Longest: —, none yet")).toBeTruthy();
		expect(screen.getByLabelText("90-day rate: —, after 7 days")).toBeTruthy();
		expect(screen.getByText("Created today")).toBeTruthy();
		expect(screen.getByText("None")).toBeTruthy();
		expect(
			screen.getByText("No logs yet. Tick it on Today to start."),
		).toBeTruthy();
		expect(screen.queryByTestId("completion-legend")).toBeNull();
	});
});

describe("D4/D5 — archived and restored", () => {
	const archivedAt = new Date(2026, 9, 12, 9);
	const run = makeHabit({
		id: 1,
		name: "Morning run",
		category: builtInCategory("Fitness"),
		frequency: { type: "weekdays", days: [1, 3, 5] },
		createdAt: new Date(2026, 2, 2),
		archivedAt,
		pauses: [{ from: "2026-08-01", to: "2026-08-05" }],
	});

	it("D4: a banner with the archive date and Restore, the streak paused, reminders paused, no Archive row", async () => {
		mockDetail = detail({}, run);
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByText("Archived on 12 October")).toBeTruthy();
		expect(
			screen.getByText(
				"Hidden from Today. Paused days stay paused and never count as missed.",
			),
		).toBeTruthy();
		expect(screen.getByLabelText(/^Streak: —, paused/)).toBeTruthy();
		expect(
			screen.getByRole("button", { name: /^Reminders.*Paused/ }),
		).toBeTruthy();
		expect(screen.getByText("FITNESS · MON, WED, FRI · ARCHIVED")).toBeTruthy();
		expect(screen.queryByText("Archive habit")).toBeNull();
		expect(screen.getByText("Delete habit")).toBeTruthy();
	});

	it("D4: Restore is instant, and its toast says it is back on Today with an Undo that re-archives as it was", async () => {
		mockDetail = detail({}, run);
		await render(<HabitDetailScreen habitId={1} />);
		await fireEvent.press(screen.getByRole("button", { name: "Restore" }));
		expect(mockRestore).toHaveBeenCalledWith(1);
		const toast = useToastStore.getState().toast;
		expect(toast).toMatchObject({
			message: "Morning run is back on Today",
			actionLabel: "Undo",
		});
		toast?.onAction?.();
		expect(mockUndoRestore).toHaveBeenCalledWith(1, {
			archivedAt,
			pauses: run.pauses,
		});
	});

	it("a failed Restore shows no 'back on Today' toast (the hook already toasted the error)", async () => {
		mockRestore.mockResolvedValue({ ok: false, error: new Error("disk") });
		mockDetail = detail({}, run);
		await render(<HabitDetailScreen habitId={1} />);
		await fireEvent.press(screen.getByRole("button", { name: "Restore" }));
		expect(useToastStore.getState().toast).toBeNull();
	});

	it("D5: restored today — the one-time banner, a fresh streak and the paused days left out of the rate", async () => {
		mockDetail = detail(
			{
				restoredToday: true,
				freshStart: true,
				currentStreak: 0,
				completionRate: {
					completed: 70,
					scheduled: 90,
					frozen: 0,
					fraction: 0.78,
					skippedPaused: true,
				},
			},
			{ ...run, archivedAt: null },
		);
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByText("Restored today")).toBeTruthy();
		expect(
			screen.getByText(
				"Your streak starts fresh with the next log. Paused days stay paused.",
			),
		).toBeTruthy();
		expect(screen.getByLabelText("Streak: 0, fresh start")).toBeTruthy();
		expect(
			screen.getByLabelText("90-day rate: 78%, paused days excluded"),
		).toBeTruthy();
		expect(screen.queryByText("Archived on 12 October")).toBeNull();
	});

	it("no banner at all for an ordinary habit", async () => {
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.queryByText("Restored today")).toBeNull();
		expect(screen.queryByText(/^Archived on/)).toBeNull();
	});
});

describe("D6 — a streak reset", () => {
	it("outlines the day in the grid's legend, explains it in a notice, and the third tile is the amber freeze count", async () => {
		mockDetail = detail({
			freezesRemaining: 0,
			streakReset: {
				missedDate: new Date(2026, 9, 14),
				poolRefillsOn: new Date(2026, 10, 1),
			},
		});
		await render(<HabitDetailScreen habitId={1} />);
		expect(
			screen.getByText("Streak reset on Wed 14 Oct — no freezes were left."),
		).toBeTruthy();
		expect(screen.getByLabelText("Freezes: 0, 0 freezes left")).toBeTruthy();
		expect(screen.queryByLabelText(/^90-day rate:/)).toBeNull();
	});
});

describe("D7 — a Break habit", () => {
	it("says resisting, nights, Resisted and Slipped — never failed", async () => {
		const phone = makeHabit({
			id: 1,
			name: "No phone in bed",
			category: builtInCategory("Home"),
			direction: "break",
			createdAt: new Date(2026, 2, 2),
		});
		mockDetail = detail(
			{
				rateDelta: null,
				longestStreak: { days: 22, endedOn: new Date(2026, 9, 1) },
				history: [
					{ date: "2026-10-22", kind: "done", value: null, note: null },
					{ date: "2026-10-13", kind: "missed", value: null, note: null },
				],
			},
			phone,
		);
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByText("HOME · BREAK · DAILY")).toBeTruthy();
		expect(screen.getByLabelText("Resisting: 9, nights in a row")).toBeTruthy();
		expect(screen.getByLabelText("Longest: 22, nights")).toBeTruthy();
		expect(screen.getByLabelText("90-day rate: 89%, resisted")).toBeTruthy();
		expect(screen.getByText("Resisted")).toBeTruthy();
		expect(screen.getByText("Slipped · not logged")).toBeTruthy();
		expect(screen.queryByText(/fail/i)).toBeNull();
	});
});

describe("Archive habit (DC5)", () => {
	async function openArchive() {
		await render(<HabitDetailScreen habitId={1} />);
		await fireEvent.press(screen.getByText("Archive habit"));
	}

	it("opens a sheet that says what it keeps, with Archive habit and Cancel", async () => {
		await openArchive();
		expect(screen.getByText("Archive Upper body?")).toBeTruthy();
		expect(
			screen.getByText(
				"It leaves Today and its reminders pause. History and streaks are kept — restore it any time from Habits › Archived.",
			),
		).toBeTruthy();
		expect(mockArchive).not.toHaveBeenCalled();
	});

	it("one tap archives, pops Detail and the toast offers Undo", async () => {
		await openArchive();
		const sheet = screen.getByTestId("sheet-modal");
		await fireEvent.press(
			within(sheet).getByRole("button", { name: "Archive habit" }),
		);
		expect(mockArchive).toHaveBeenCalledWith(1);
		expect(mockBack).toHaveBeenCalledTimes(1);
		const toast = useToastStore.getState().toast;
		expect(toast).toMatchObject({
			message: "Upper body archived",
			actionLabel: "Undo",
		});
		toast?.onAction?.();
		expect(mockRestore).toHaveBeenCalledWith(1);
	});

	it("Cancel closes the sheet and archives nothing", async () => {
		await openArchive();
		const sheet = screen.getByTestId("sheet-modal");
		await fireEvent.press(
			within(sheet).getByRole("button", { name: "Cancel" }),
		);
		expect(mockArchive).not.toHaveBeenCalled();
		expect(mockBack).not.toHaveBeenCalled();
	});

	it("a failed archive keeps the sheet open, pops nothing and offers no Undo", async () => {
		mockArchive.mockResolvedValue({ ok: false, error: new Error("disk") });
		await openArchive();
		const sheet = screen.getByTestId("sheet-modal");
		await fireEvent.press(
			within(sheet).getByRole("button", { name: "Archive habit" }),
		);
		expect(mockBack).not.toHaveBeenCalled();
		expect(useToastStore.getState().toast).toBeNull();
		expect(screen.getByText("Archive Upper body?")).toBeTruthy();
	});
});

describe("Delete habit (DC1–DC4)", () => {
	async function openDelete() {
		await render(<HabitDetailScreen habitId={1} />);
		await fireEvent.press(screen.getByText("Delete habit"));
	}

	it("DC1: names what is lost, Archive instead first, then Delete permanently, then Cancel", async () => {
		await openDelete();
		expect(screen.getByText("Delete Upper body?")).toBeTruthy();
		expect(
			screen.getByText(
				"Deletes Upper body and its 214 logs. Archiving keeps them and can be undone.",
			),
		).toBeTruthy();
		const order = screen
			.getAllByText(/^(Archive instead|Delete permanently|Cancel)$/)
			.map((node) => node.props.children);
		expect(order).toEqual(["Archive instead", "Delete permanently", "Cancel"]);
		expect(screen.queryByText("Close")).toBeNull();
	});

	it("DC3: Delete permanently deletes, pops Detail to where it was, and the toast has no Undo", async () => {
		await openDelete();
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(mockDelete).toHaveBeenCalledWith(1);
		expect(mockBack).toHaveBeenCalledTimes(1);
		const toast = useToastStore.getState().toast;
		expect(toast?.message).toBe("Upper body deleted");
		expect(toast?.actionLabel).toBeUndefined();
	});

	it("DC3: while deleting, the sheet says so and Cancel is disabled", async () => {
		mockActionState = { ...mockActionState, isDeleting: true };
		await openDelete();
		expect(screen.getByText("Deleting…")).toBeTruthy();
		expect(
			screen.getByText("Keep the app open — this takes a moment."),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
	});

	it("DC4: a failed delete stays in the sheet with a banner, nothing popped, no toast, and Delete can be tried again", async () => {
		mockDelete.mockResolvedValueOnce({ ok: false, error: new Error("disk") });
		mockActionState = { ...mockActionState, deleteFailed: true };
		await openDelete();
		expect(screen.getByRole("alert")).toHaveProp(
			"accessibilityLabel",
			"Couldn’t delete. Nothing was changed. Try again.",
		);
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(mockBack).not.toHaveBeenCalled();
		expect(useToastStore.getState().toast).toBeNull();
		await fireEvent.press(screen.getByText("Delete permanently"));
		expect(mockDelete).toHaveBeenCalledTimes(2);
	});

	it("once the habit leaves the list mid-delete, Detail shows the neutral blank, not 'Habit not found'", async () => {
		let release: (value: unknown) => void = () => {};
		mockDelete.mockReturnValueOnce(
			new Promise((resolve) => (release = resolve)),
		);
		const view = await render(<HabitDetailScreen habitId={1} />);
		await fireEvent.press(screen.getByText("Delete habit"));
		await fireEvent.press(screen.getByText("Delete permanently"));
		mockDetail = null;
		await view.rerender(<HabitDetailScreen habitId={1} />);
		expect(screen.queryByText("Habit not found")).toBeNull();
		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		await act(async () => release(OK));
	});

	it("Archive instead archives (not deletes) and pops with the Undo toast", async () => {
		await openDelete();
		await fireEvent.press(
			screen.getByRole("button", { name: /^Archive instead/ }),
		);
		expect(mockArchive).toHaveBeenCalledWith(1);
		expect(mockDelete).not.toHaveBeenCalled();
		expect(useToastStore.getState().toast?.actionLabel).toBe("Undo");
	});

	it("Cancel closes the sheet and deletes nothing", async () => {
		await openDelete();
		await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
		expect(mockDelete).not.toHaveBeenCalled();
	});

	it("an archived habit's sheet offers no Archive instead and no archive claim", async () => {
		mockDetail = detail(
			{},
			makeHabit({
				id: 1,
				name: "Morning run",
				category: builtInCategory("Fitness"),
				createdAt: new Date(2026, 2, 2),
				archivedAt: new Date(2026, 9, 12),
			}),
		);
		await render(<HabitDetailScreen habitId={1} />);
		await fireEvent.press(screen.getByText("Delete habit"));
		expect(screen.queryByText("Archive instead")).toBeNull();
		expect(
			screen.getByText(
				"Deletes Morning run and its 214 logs. This can’t be undone.",
			),
		).toBeTruthy();
	});
});
