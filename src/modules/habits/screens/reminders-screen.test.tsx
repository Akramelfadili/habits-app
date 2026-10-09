import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TOAST_DURATION_MS } from "@/components/ui/composite/toast-host";
import { useToastStore } from "@/store/toast-store";
import { REMINDER_CAP_MESSAGE } from "../constants";
import type {
	ReminderScreenData,
	ReminderWithConflicts,
} from "../hooks/use-reminder-queries";
import { makeHabit } from "../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
	// Renders the iOS back item, so the test exercises what reaches the nav bar.
	Stack: {
		Screen: ({
			options,
		}: {
			options?: {
				unstable_headerLeftItems?: (props: {
					canGoBack: boolean;
				}) => { element?: unknown }[];
			};
		}) =>
			options?.unstable_headerLeftItems?.({ canGoBack: true })[0]?.element ??
			null,
	},
	useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock("@/components/ui/primitives/time-wheel", () => ({
	TimeWheel: () => null,
}));

let mockData: ReminderScreenData | null | undefined = null;
jest.mock("../hooks/use-reminder-queries", () => ({
	useReminderQueries: () => mockData,
}));

const mockAddReminder = jest.fn();
const mockEditReminder = jest.fn();
const mockRemoveReminder = jest.fn();
const mockRestoreReminder = jest.fn();
jest.mock("../hooks/use-reminder-actions", () => ({
	useReminderActions: () => ({
		addReminder: mockAddReminder,
		isAdding: false,
		addError: null,
		editReminder: mockEditReminder,
		removeReminder: mockRemoveReminder,
		restoreReminder: mockRestoreReminder,
	}),
}));

import { RemindersScreen } from "./reminders-screen";

const habit = makeHabit({
	id: 1,
	name: "Meditate",
	frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
});

function reminder(
	id: number,
	hour: number,
	weekdays: ReminderWithConflicts["weekdays"],
	overrides: Partial<ReminderWithConflicts> = {},
): ReminderWithConflicts {
	return {
		id,
		habitId: 1,
		hour,
		minute: 0,
		weekdays,
		enabled: true,
		unscheduledDays: [],
		...overrides,
	};
}

function data(overrides: Partial<ReminderScreenData> = {}): ReminderScreenData {
	return {
		habit,
		reminders: [
			reminder(1, 7, [1, 2, 3, 4, 5]),
			reminder(2, 21, [6, 7], { unscheduledDays: [6, 7] }),
		],
		cap: 4,
		atCap: false,
		notificationsDenied: false,
		...overrides,
	};
}

describe("RemindersScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEditReminder.mockResolvedValue({ ok: true, value: undefined });
		mockData = data();
	});

	it("labels the plain back button with the habit's name, and goes back through it", async () => {
		mockBack.mockReset();
		await render(<RemindersScreen habitId={1} />);
		const back = screen.getByLabelText(`Back to ${habit.name}`);
		expect(screen.getByText(habit.name)).toBeTruthy();
		await fireEvent.press(back);
		expect(mockBack).toHaveBeenCalledTimes(1);
	});

	it("says so when the habit doesn't exist", async () => {
		mockData = null;
		await render(<RemindersScreen habitId={9} />);
		expect(screen.getByText("Habit not found")).toBeTruthy();
	});

	it("lists every time; only a conflicting one starts expanded, with its warning", async () => {
		await render(<RemindersScreen habitId={1} />);

		expect(screen.getByText("07:00")).toBeTruthy();
		expect(screen.getByText("21:00")).toBeTruthy();
		// Only the 21:00 card's chip row is showing.
		expect(screen.getAllByLabelText("Monday")).toHaveLength(1);
		expect(
			screen.getByText(/Saturday and Sunday are not scheduled days/),
		).toBeTruthy();
	});

	it("tapping a card expands it to show its own days", async () => {
		await render(<RemindersScreen habitId={1} />);

		await fireEvent.press(screen.getByLabelText("Reminder at 07:00, Weekdays"));
		expect(screen.getAllByLabelText("Monday")).toHaveLength(2);

		await fireEvent.press(screen.getAllByLabelText("Saturday")[0]);
		expect(mockEditReminder).toHaveBeenCalledWith(habit, 1, {
			weekdays: [1, 2, 3, 4, 5, 6],
		});
	});

	it("keeps an opened card open when a day change gives it a conflict, so its warning shows", async () => {
		const view = await render(<RemindersScreen habitId={1} />);
		await fireEvent.press(screen.getByLabelText("Reminder at 07:00, Weekdays"));

		// The edit lands: 07:00 now includes Saturday, an unscheduled day.
		mockData = data({
			reminders: [
				reminder(1, 7, [1, 2, 3, 4, 5, 6], { unscheduledDays: [6] }),
				reminder(2, 21, [6, 7], { unscheduledDays: [6, 7] }),
			],
		});
		await view.rerender(<RemindersScreen habitId={1} />);

		expect(screen.getByText(/^Saturday is not a scheduled day/)).toBeTruthy();
	});

	it("toggles one reminder independently", async () => {
		await render(<RemindersScreen habitId={1} />);
		await fireEvent(
			screen.getByLabelText("Reminder at 21:00 on"),
			"valueChange",
			false,
		);
		expect(mockEditReminder).toHaveBeenCalledWith(habit, 2, { enabled: false });
	});

	describe("Remove with Undo (A5-06)", () => {
		beforeEach(() => {
			mockRemoveReminder.mockResolvedValue({ ok: true, value: undefined });
			mockRestoreReminder.mockResolvedValue({ ok: true, value: undefined });
			useToastStore.setState({ toast: null });
		});

		it("removes a time from its expanded card at once — no confirmation — and offers Undo", async () => {
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByText("Remove"));

			expect(mockRemoveReminder).toHaveBeenCalledWith(habit, 2);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Removed the 21:00 reminder");
			expect(toast?.actionLabel).toBe("Undo");
		});

		it("Undo restores that same reminder (its id, time and days), not a new one", async () => {
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByText("Remove"));

			await act(async () => useToastStore.getState().toast?.onAction?.());

			expect(mockRestoreReminder).toHaveBeenCalledTimes(1);
			expect(mockRestoreReminder).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 2,
					hour: 21,
					minute: 0,
					weekdays: [6, 7],
				}),
			);
			expect(mockAddReminder).not.toHaveBeenCalled();
		});

		it("shows no Undo toast when the removal itself failed", async () => {
			mockRemoveReminder.mockResolvedValue({ ok: false });
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByText("Remove"));
			expect(useToastStore.getState().toast).toBeNull();
		});

		it("once the toast has expired there is nothing left to undo", async () => {
			jest.useFakeTimers();
			try {
				const { ToastHost } = require("@/components/ui/composite/toast-host");
				await render(
					<>
						<ToastHost />
						<RemindersScreen habitId={1} />
					</>,
				);
				await fireEvent.press(screen.getByText("Remove"));
				expect(screen.getByText("Undo")).toBeTruthy();

				await act(() => jest.advanceTimersByTime(TOAST_DURATION_MS));

				expect(screen.queryByText("Undo")).toBeNull();
				expect(useToastStore.getState().toast).toBeNull();
				expect(mockRestoreReminder).not.toHaveBeenCalled();
			} finally {
				jest.useRealTimers();
			}
		});
	});

	describe("?addTime=<day> (Monthly pattern action)", () => {
		beforeEach(() => {
			mockAddReminder.mockResolvedValue({
				ok: true,
				value: reminder(3, 9, [6]),
			});
		});

		it("adds a time with just that day pre-selected and opens its time picker", async () => {
			await render(<RemindersScreen habitId={1} addTime="6" />);
			await act(async () => {});

			expect(mockAddReminder).toHaveBeenCalledTimes(1);
			expect(mockAddReminder).toHaveBeenCalledWith(habit, [6]);
		});

		it("does it once, however often the screen re-renders", async () => {
			const { rerender } = await render(
				<RemindersScreen habitId={1} addTime="6" />,
			);
			await rerender(<RemindersScreen habitId={1} addTime="6" />);
			await act(async () => {});
			expect(mockAddReminder).toHaveBeenCalledTimes(1);
		});

		it("ignores a bad day, and does nothing at the reminder cap", async () => {
			await render(<RemindersScreen habitId={1} addTime="9" />);
			await act(async () => {});
			expect(mockAddReminder).not.toHaveBeenCalled();
		});

		it("does not add past the cap", async () => {
			mockData = data({ atCap: true });
			await render(<RemindersScreen habitId={1} addTime="6" />);
			await act(async () => {});
			expect(mockAddReminder).not.toHaveBeenCalled();
		});

		it("waits for the habit to load", async () => {
			mockData = undefined;
			const { rerender } = await render(
				<RemindersScreen habitId={1} addTime="6" />,
			);
			expect(mockAddReminder).not.toHaveBeenCalled();
			mockData = data();
			await rerender(<RemindersScreen habitId={1} addTime="6" />);
			await act(async () => {});
			expect(mockAddReminder).toHaveBeenCalledTimes(1);
		});
	});

	it("adds a time, then opens its time picker", async () => {
		// The live query would list the new reminder; here #1 stands in for it.
		mockAddReminder.mockResolvedValue({
			ok: true,
			value: reminder(1, 9, [1, 2, 3, 4, 5]),
		});
		await render(<RemindersScreen habitId={1} />);

		expect(screen.queryByText("Save time")).toBeNull();
		await fireEvent.press(
			screen.getByRole("button", { name: "Add a time, 2 of 4" }),
		);

		expect(mockAddReminder).toHaveBeenCalledWith(habit);
		expect(screen.getByText("Save time")).toBeTruthy();
	});

	it("edits a time through the sheet", async () => {
		await render(<RemindersScreen habitId={1} />);

		// 21:00 starts expanded (it has a conflict), so its Change time is showing.
		await fireEvent.press(screen.getByText("Change time"));
		await fireEvent.press(screen.getByText("Save time"));

		expect(mockEditReminder).toHaveBeenCalledWith(habit, 2, {
			hour: 21,
			minute: 0,
		});
	});

	it("a failed save keeps the time sheet open — the edit is not silently lost", async () => {
		mockEditReminder.mockResolvedValueOnce({
			ok: false,
			error: new Error("x"),
		});
		await render(<RemindersScreen habitId={1} />);

		await fireEvent.press(screen.getByText("Change time"));
		await fireEvent.press(screen.getByText("Save time"));

		expect(screen.getByText("Save time")).toBeTruthy();

		await fireEvent.press(screen.getByText("Save time"));
		expect(mockEditReminder).toHaveBeenCalledTimes(2);
		expect(screen.queryByText("Save time")).toBeNull();
	});

	it("a failed add does not open the time picker", async () => {
		mockAddReminder.mockResolvedValue({ ok: false, error: new Error("x") });
		await render(<RemindersScreen habitId={1} />);

		await fireEvent.press(
			screen.getByRole("button", { name: "Add a time, 2 of 4" }),
		);

		expect(screen.queryByText("Save time")).toBeNull();
	});

	it("renders a neutral blank — not 'Habit not found' — while loading (A5-04)", async () => {
		mockData = undefined;
		await render(<RemindersScreen habitId={1} />);
		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		expect(screen.queryByText("Habit not found")).toBeNull();
	});

	it("at 4 of 4, disables Add a time and explains the cap", async () => {
		mockData = data({
			reminders: [1, 2, 3, 4].map((id) => reminder(id, 6 + id, [1])),
			atCap: true,
		});
		await render(<RemindersScreen habitId={1} />);

		const add = screen.getByRole("button", { name: "Add a time, 4 of 4" });
		expect(add).toBeDisabled();
		expect(screen.getByText(REMINDER_CAP_MESSAGE)).toBeTruthy();
	});

	it("shows a persistent notice when notifications are denied, keeping everything editable", async () => {
		mockData = data({ notificationsDenied: true });
		await render(<RemindersScreen habitId={1} />);

		expect(screen.getByText(/Notifications are off for this app/)).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Add a time, 2 of 4" }),
		).not.toBeDisabled();
	});

	it("has no notice when notifications are allowed", async () => {
		await render(<RemindersScreen habitId={1} />);
		expect(screen.queryByText(/Notifications are off/)).toBeNull();
	});

	it("no longer has an Evening review toggle (HAB-21)", async () => {
		await render(<RemindersScreen habitId={1} />);
		expect(screen.queryByLabelText("Evening review")).toBeNull();
		expect(screen.queryByText(/One nudge at/)).toBeNull();
	});

	it("points at Settings, and the link opens it", async () => {
		await render(<RemindersScreen habitId={1} />);
		expect(screen.getByText(/Looking for the evening review\?/)).toBeTruthy();

		await fireEvent.press(
			screen.getByRole("link", { name: "Open Settings →" }),
		);
		expect(mockPush).toHaveBeenCalledWith("/habits/settings");
	});

	it("shows the 'Up to four times' caption, then the pointer, below the add row", async () => {
		await render(<RemindersScreen habitId={1} />);
		expect(
			screen.getByText("Up to four times a day for this habit."),
		).toBeTruthy();
		expect(screen.getByTestId("moved-setting-pointer")).toBeTruthy();
	});

	it("keeps the pointer when empty and at the cap (cap message replaces the caption)", async () => {
		mockData = { ...data(), reminders: [] };
		const view = await render(<RemindersScreen habitId={1} />);
		expect(screen.getByTestId("moved-setting-pointer")).toBeTruthy();
		await view.unmount();

		mockData = { ...data(), atCap: true };
		await render(<RemindersScreen habitId={1} />);
		expect(screen.getByText(REMINDER_CAP_MESSAGE)).toBeTruthy();
		expect(
			screen.queryByText("Up to four times a day for this habit."),
		).toBeNull();
		expect(screen.getByTestId("moved-setting-pointer")).toBeTruthy();
	});
});
