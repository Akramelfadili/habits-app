import { fireEvent, render, screen } from "@testing-library/react-native";
import type { HabitDetail } from "../hooks/use-habit-detail-queries";
import type { RetroLogDay } from "../hooks/use-retro-log-queries";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
jest.mock("../repositories/frozen-day-repository", () => ({}));
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, back: mockBack }),
	// Renders the header's right-hand action inline, so tests can press it.
	Stack: {
		Screen: ({ options }: { options?: { headerRight?: () => unknown } }) =>
			options?.headerRight?.() ?? null,
	},
}));
const mockArchive = jest.fn();
const mockDelete = jest.fn();
const mockRestore = jest.fn();
jest.mock("../hooks/use-habit-detail-actions", () => ({
	useHabitDetailActions: () => ({
		archiveHabit: mockArchive,
		isArchiving: false,
		deleteHabit: mockDelete,
		isDeleting: false,
		restoreHabit: mockRestore,
	}),
}));

const today = new Date(2026, 8, 23, 12);
let mockDetail: HabitDetail | null = null;
jest.mock("../hooks/use-habit-detail-queries", () => ({
	useHabitDetailQueries: () => mockDetail,
}));

// The sheet's own data is covered by use-retro-log-queries.test.ts — here it
// only needs to echo back which day was tapped.
const mockRetroLogQueries = jest.fn();
const mockSaveDay = jest.fn();
jest.mock("../hooks/use-retro-log-queries", () => ({
	useRetroLogQueries: (habitId: number, date: Date | null) =>
		mockRetroLogQueries(habitId, date),
}));
jest.mock("../hooks/use-retro-log-actions", () => ({
	useRetroLogActions: () => ({ saveDay: mockSaveDay, isSaving: false }),
}));

import { useToastStore } from "@/store/toast-store";
import { buildHeatmapWeeks } from "../services/habit-history";
import { HabitDetailScreen } from "./habit-detail-screen";

const habit = makeHabit({
	name: "Glass of water",
	category: "Morning",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
	createdAt: new Date(2026, 0, 1),
});

beforeEach(() => {
	mockSaveDay.mockReset().mockResolvedValue(undefined);
	mockRetroLogQueries
		.mockReset()
		.mockImplementation(
			(_habitId: number, date: Date | null): RetroLogDay | null =>
				date ? { date, habits: [habit], values: { 1: 0 }, note: "" } : null,
		);
});

function detail(overrides: Partial<HabitDetail> = {}): HabitDetail {
	return {
		habit,
		currentStreak: 24,
		loggedDays: 218,
		longestStreak: { days: 41, endedOn: new Date(2026, 5, 30) },
		completionRate: { completed: 78, scheduled: 90, fraction: 78 / 90 },
		heatmapWeeks: buildHeatmapWeeks({
			habit,
			entries: [],
			frozenDates: new Set(),
			today,
		}),
		recentEntries: [
			{
				date: "2026-09-23",
				entry: {
					id: 2,
					habitId: 1,
					date: "2026-09-23",
					value: 6,
					createdAt: today,
				},
				note: null,
			},
			{
				date: "2026-09-22",
				entry: {
					id: 1,
					habitId: 1,
					date: "2026-09-22",
					value: 8,
					createdAt: today,
				},
				note: null,
			},
		],
		hasEntries: true,
		reminders: [],
		today,
		...overrides,
	};
}

describe("HabitDetailScreen", () => {
	it("shows the header, the three stat tiles, and recent entries in order", async () => {
		mockDetail = detail();
		await render(<HabitDetailScreen habitId={1} />);

		expect(screen.getByText("Glass of water")).toBeTruthy();
		expect(screen.getByText("Morning · 8 glasses · daily")).toBeTruthy();
		expect(screen.getByLabelText("Current: 24, day streak")).toBeTruthy();
		expect(screen.getByLabelText("Longest: 41, days, in Jun")).toBeTruthy();
		expect(screen.getByLabelText("90 days: 87%, 78 of 90 days")).toBeTruthy();
		expect(screen.getByText("Last 10 weeks")).toBeTruthy();

		const dates = screen
			.getAllByText(/^(Today|Yesterday)$/)
			.map((node) => node.props.children);
		expect(dates).toEqual(["Today", "Yesterday"]);
		expect(screen.getByText("6 / 8")).toBeTruthy();
	});

	it("renders the new-habit variant: zero/dash stats and an entries prompt", async () => {
		mockDetail = detail({
			currentStreak: 0,
			longestStreak: { days: 0, endedOn: null },
			completionRate: { completed: 0, scheduled: 0, fraction: null },
			recentEntries: [],
			hasEntries: false,
		});
		await render(<HabitDetailScreen habitId={1} />);

		expect(screen.getByLabelText("Longest: 0, no streak yet")).toBeTruthy();
		expect(screen.getByLabelText("90 days: —, nothing yet")).toBeTruthy();
		expect(screen.getByText("Nothing logged yet")).toBeTruthy();
		expect(screen.getByText("No entries yet")).toBeTruthy();
	});

	it("handles an id that no longer resolves", async () => {
		mockDetail = null;
		await render(<HabitDetailScreen habitId={99} />);
		expect(screen.getByText("Habit not found")).toBeTruthy();
	});

	it("shows notes under their dates, including a noted day with nothing logged", async () => {
		mockDetail = detail({
			recentEntries: [
				{
					date: "2026-09-22",
					entry: {
						id: 1,
						habitId: 1,
						date: "2026-09-22",
						value: 8,
						createdAt: today,
					},
					note: "Kept the bottle on the table",
				},
				{ date: "2026-09-21", entry: null, note: "Sick, skipped it" },
			],
		});
		await render(<HabitDetailScreen habitId={1} />);
		expect(screen.getByText("Kept the bottle on the table")).toBeTruthy();
		expect(screen.getByText("Sick, skipped it")).toBeTruthy();
		expect(screen.getByText("Not logged")).toBeTruthy();
	});

	describe("retro log (HAB-10)", () => {
		it("tapping a past heatmap day opens the log sheet for that date", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);
			expect(screen.queryByText("Save changes")).toBeNull();

			await fireEvent.press(screen.getByLabelText(/^Monday 21 September/));

			expect(mockRetroLogQueries).toHaveBeenLastCalledWith(
				1,
				new Date(2026, 8, 21),
			);
			expect(
				screen.getByRole("header", { name: "Monday, 21 September" }),
			).toBeTruthy();
		});

		it("future days aren't tappable", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);

			await fireEvent.press(screen.getByLabelText(/^Friday 25 September/));

			expect(screen.queryByText("Save changes")).toBeNull();
		});

		it("saving writes the day with this habit as the note's owner, then closes", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);
			await fireEvent.press(screen.getByLabelText(/^Monday 21 September/));

			await fireEvent.press(
				screen.getByRole("checkbox", { name: "Glass of water, done" }),
			);
			await fireEvent.changeText(screen.getByDisplayValue(""), "Hotel");
			await fireEvent.press(
				screen.getByRole("button", { name: "Save changes" }),
			);

			expect(mockSaveDay).toHaveBeenCalledWith(new Date(2026, 8, 21), {
				values: [{ habitId: 1, value: 8 }],
				noteHabitId: 1,
				note: "Hotel",
			});
			expect(screen.queryByText("Save changes")).toBeNull();
		});

		it("Cancel discards the draft without saving", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);
			await fireEvent.press(screen.getByLabelText(/^Monday 21 September/));
			await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));

			expect(mockSaveDay).not.toHaveBeenCalled();
			expect(screen.queryByText("Save changes")).toBeNull();
		});
	});

	describe("Reminders row (HAB-12)", () => {
		it("summarizes the habit's reminders and opens the Reminders screen", async () => {
			mockDetail = detail({
				reminders: [
					{
						id: 1,
						habitId: 1,
						hour: 7,
						minute: 20,
						weekdays: [1, 2, 3, 4, 5],
						enabled: true,
					},
				],
			});
			await render(<HabitDetailScreen habitId={1} />);

			expect(screen.getByText("1 on · 07:20")).toBeTruthy();
			await fireEvent.press(screen.getByText("Reminders"));
			expect(mockPush).toHaveBeenCalledWith("/habits/reminders/1");
		});

		it("says so when none are set", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);
			expect(screen.getByText("None set")).toBeTruthy();
		});
	});

	it("opens Edit from the header (HAB-01)", async () => {
		mockDetail = detail();
		await render(<HabitDetailScreen habitId={1} />);

		await fireEvent.press(screen.getByText("Edit"));

		expect(mockPush).toHaveBeenCalledWith(`/edit-habit/${habit.id}`);
	});

	describe("archive (HAB-13)", () => {
		beforeEach(() => {
			mockArchive.mockReset().mockResolvedValue(undefined);
			mockBack.mockReset();
		});

		it("archives in one tap, without the delete confirmation, then leaves", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);

			await fireEvent.press(screen.getByText("Archive habit"));

			expect(mockArchive).toHaveBeenCalledWith(1);
			expect(screen.queryByText("Delete “Glass of water”?")).toBeNull();
			expect(mockBack).toHaveBeenCalled();
		});

		it("confirms on the screen it returns to, with an Undo that restores", async () => {
			useToastStore.setState({ toast: null });
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);

			await fireEvent.press(screen.getByText("Archive habit"));

			const toast = useToastStore.getState().toast;
			expect(toast).toMatchObject({
				message: "Archived 'Glass of water'",
				actionLabel: "Undo",
			});
			toast?.onAction?.();
			expect(mockRestore).toHaveBeenCalledWith(1);
		});

		it("isn't offered for a habit that's already archived", async () => {
			mockDetail = detail({
				habit: { ...habit, archivedAt: new Date(2026, 8, 1) },
			});
			await render(<HabitDetailScreen habitId={1} />);

			expect(screen.queryByText("Archive habit")).toBeNull();
			expect(screen.getByText("Delete habit")).toBeTruthy();
		});
	});

	describe("delete (HAB-13)", () => {
		beforeEach(() => {
			mockArchive.mockReset().mockResolvedValue(undefined);
			mockDelete.mockReset().mockResolvedValue(undefined);
			mockBack.mockReset();
		});

		it("asks for confirmation before deleting anything", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);

			await fireEvent.press(screen.getByText("Delete habit"));

			expect(screen.getByText("Delete “Glass of water”?")).toBeTruthy();
			expect(
				screen.getByText(
					"This removes the habit and all 218 days logged permanently. It cannot be undone.",
				),
			).toBeTruthy();
			expect(mockDelete).not.toHaveBeenCalled();
		});

		it("deletes only from the confirmation, then leaves the screen", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);

			await fireEvent.press(screen.getByText("Delete habit"));
			await fireEvent.press(screen.getByText("Delete permanently"));

			expect(mockDelete).toHaveBeenCalledWith(1);
			expect(mockBack).toHaveBeenCalled();
			// Unrecoverable, so it's confirmed without an Undo.
			expect(useToastStore.getState().toast).toMatchObject({
				message: "Deleted 'Glass of water'",
			});
			expect(useToastStore.getState().toast?.actionLabel).toBeUndefined();
		});

		it("can archive instead", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);

			await fireEvent.press(screen.getByText("Delete habit"));
			await fireEvent.press(
				screen.getByText("Archive instead — keeps history"),
			);

			expect(mockArchive).toHaveBeenCalledWith(1);
			expect(mockDelete).not.toHaveBeenCalled();
		});

		it("keeping the habit just closes the confirmation", async () => {
			mockDetail = detail();
			await render(<HabitDetailScreen habitId={1} />);

			await fireEvent.press(screen.getByText("Delete habit"));
			await fireEvent.press(screen.getByText("Keep habit"));

			expect(screen.queryByText("Delete “Glass of water”?")).toBeNull();
			expect(mockDelete).not.toHaveBeenCalled();
			expect(mockArchive).not.toHaveBeenCalled();
		});
	});
});
