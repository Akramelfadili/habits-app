import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import { motion } from "@/theme/theme";
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
	useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));
const mockTimeWheel = jest.fn();
jest.mock("@/components/ui/primitives/time-wheel", () => ({
	TimeWheel: (props: { hour: number; minute: number }) => {
		mockTimeWheel(props);
		return null;
	},
}));
jest.mock("@/utils/use-accessibility-text-size", () => ({
	useAccessibilityTextSize: () => false,
}));
const mockOpenSettings = jest.fn();
jest
	.spyOn(require("react-native").Linking, "openSettings")
	.mockImplementation((...args: unknown[]) => mockOpenSettings(...args));

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
		mockAddReminder.mockResolvedValue({ ok: true, value: undefined });
		mockRemoveReminder.mockResolvedValue({ ok: true, value: undefined });
		mockRestoreReminder.mockResolvedValue({ ok: true, value: undefined });
		useToastStore.setState({ toast: null });
		mockData = data();
	});

	it("labels the plain back button with the habit's name, and goes back through it", async () => {
		mockBack.mockReset();
		await render(<RemindersScreen habitId={1} />);
		const back = screen.getByLabelText(`Back to ${habit.name}`);
		await fireEvent.press(back);
		expect(mockBack).toHaveBeenCalledTimes(1);
	});

	it("heads the screen with the habit and how it repeats", async () => {
		await render(<RemindersScreen habitId={1} />);
		expect(screen.getByText("MEDITATE · MON–FRI")).toBeTruthy();
		expect(screen.getByText("Reminders")).toBeTruthy();
	});

	it("says so when the habit doesn't exist", async () => {
		mockData = null;
		await render(<RemindersScreen habitId={9} />);
		expect(screen.getByText("Habit not found")).toBeTruthy();
	});

	describe("no times (R1)", () => {
		beforeEach(() => {
			mockData = data({ reminders: [] });
		});

		it("is an empty state with one clear action, and no + in the header", async () => {
			await render(<RemindersScreen habitId={1} />);
			expect(screen.getByText("No reminders yet")).toBeTruthy();
			expect(
				screen.getByText("Add a time and choose the days it repeats."),
			).toBeTruthy();
			expect(screen.getAllByRole("button", { name: "Add time" })).toHaveLength(
				1,
			);
		});

		it("Add time opens the sheet on 09:00, on the days the habit falls on", async () => {
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByRole("button", { name: "Add time" }));
			expect(mockTimeWheel.mock.calls.at(-1)?.[0]).toMatchObject({
				hour: 9,
				minute: 0,
			});
			// Mon–Fri habit: its five days are on, the weekend is not offered by default.
			expect(
				screen.getByLabelText("Monday").props.accessibilityState.checked,
			).toBe(true);
			expect(
				screen.getByLabelText("Saturday").props.accessibilityState.checked,
			).toBe(false);
		});
	});

	describe("times set (R2)", () => {
		it("lists each 24-hour time with its own days, each one readable line", async () => {
			await render(<RemindersScreen habitId={1} />);
			expect(screen.getByLabelText("07:00, Weekdays")).toBeTruthy();
			expect(screen.getByLabelText("21:00, Sat, Sun")).toBeTruthy();
			expect(
				screen.getByText("24-hour times. Tap a time to change its days."),
			).toBeTruthy();
		});

		it("a stored-off reminder says Off, and editing it turns it back on", async () => {
			mockData = data({
				reminders: [reminder(1, 7, [1, 2], { enabled: false })],
			});
			await render(<RemindersScreen habitId={1} />);
			expect(screen.getByLabelText("07:00, Mon, Tue · Off")).toBeTruthy();
			await fireEvent.press(screen.getByLabelText("07:00, Mon, Tue · Off"));
			await fireEvent.press(screen.getByText("Save time"));
			expect(mockEditReminder).toHaveBeenCalledWith(
				habit,
				1,
				expect.objectContaining({ enabled: true }),
			);
		});

		it("tapping a time opens its sheet; saving changes its time and days", async () => {
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByLabelText("07:00, Weekdays"));
			expect(screen.getByText("Reminder time")).toBeTruthy();
			await fireEvent.press(screen.getByLabelText("Saturday"));
			await fireEvent.press(screen.getByText("Save time"));
			expect(mockEditReminder).toHaveBeenCalledWith(habit, 1, {
				hour: 7,
				minute: 0,
				weekdays: [1, 2, 3, 4, 5, 6],
				enabled: true,
			});
		});

		it("the + adds a time with the chosen time and days in one write", async () => {
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByRole("button", { name: "Add time" }));
			await fireEvent.press(screen.getByText("Save time"));
			expect(mockAddReminder).toHaveBeenCalledWith(habit, {
				hour: 9,
				minute: 0,
				weekdays: [1, 2, 3, 4, 5],
			});
		});

		it("keeps the sheet open when saving fails", async () => {
			mockEditReminder.mockResolvedValue({ ok: false });
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByLabelText("07:00, Weekdays"));
			await fireEvent.press(screen.getByText("Save time"));
			expect(screen.getByText("Reminder time")).toBeTruthy();
		});

		it("warns, per time, about days the habit is never due on", async () => {
			await render(<RemindersScreen habitId={1} />);
			expect(
				screen.getByText(/21:00: Saturday and Sunday are not scheduled days/),
			).toBeTruthy();
		});

		it("at four times: no +, and the note says why", async () => {
			mockData = data({
				reminders: [1, 2, 3, 4].map((id) => reminder(id, id, [1])),
				atCap: true,
			});
			await render(<RemindersScreen habitId={1} />);
			expect(screen.queryByRole("button", { name: "Add time" })).toBeNull();
			expect(screen.getByText(REMINDER_CAP_MESSAGE)).toBeTruthy();
		});
	});

	describe("removing with Undo (R3)", () => {
		it("removes a time at once — no confirmation — and the toast names it and offers Undo", async () => {
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByLabelText("Remove reminder at 21:00"));

			expect(mockRemoveReminder).toHaveBeenCalledWith(habit, 2);
			const toast = useToastStore.getState().toast;
			expect(toast?.message).toBe("Reminder at 21:00 removed");
			expect(toast?.actionLabel).toBe("Undo");
		});

		it("Undo restores that same reminder (its id, time and days), not a new one", async () => {
			await render(<RemindersScreen habitId={1} />);
			await fireEvent.press(screen.getByLabelText("Remove reminder at 21:00"));
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
			await fireEvent.press(screen.getByLabelText("Remove reminder at 21:00"));
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
				await fireEvent.press(
					screen.getByLabelText("Remove reminder at 21:00"),
				);
				expect(screen.getByText("Undo")).toBeTruthy();
				await act(() => jest.advanceTimersByTime(motion.toast.hold.undo));
				expect(screen.queryByText("Undo")).toBeNull();
				expect(mockRestoreReminder).not.toHaveBeenCalled();
			} finally {
				jest.useRealTimers();
			}
		});
	});

	describe("notifications off (R5)", () => {
		it("shows no banner when notifications are on", async () => {
			await render(<RemindersScreen habitId={1} />);
			expect(screen.queryByText("Notifications are off")).toBeNull();
		});

		it("explains why nothing arrives, offers Open Settings, and keeps every time editable", async () => {
			mockData = data({ notificationsDenied: true });
			await render(<RemindersScreen habitId={1} />);
			expect(screen.getByText("Notifications are off")).toBeTruthy();
			expect(
				screen.getByText(
					"Reminders won’t arrive until you allow them in iOS Settings.",
				),
			).toBeTruthy();
			await fireEvent.press(screen.getByText("Open Settings"));
			expect(mockOpenSettings).toHaveBeenCalledTimes(1);

			await fireEvent.press(screen.getByLabelText("07:00, Weekdays"));
			await fireEvent.press(screen.getByText("Save time"));
			expect(mockEditReminder).toHaveBeenCalled();
		});
	});

	it("shows a blank, never a not-found flash, while the habit list loads", async () => {
		mockData = undefined;
		await render(<RemindersScreen habitId={1} />);
		expect(screen.getByTestId("screen-loading")).toBeTruthy();
		expect(screen.queryByText("Habit not found")).toBeNull();
	});
});
