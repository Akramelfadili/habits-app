import { fireEvent, render, screen } from "@testing-library/react-native";
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
jest.mock("expo-router", () => ({
	Stack: { Screen: () => null },
}));
jest.mock("@/components/ui/primitives/time-wheel", () => ({
	TimeWheel: () => null,
}));

let mockData: ReminderScreenData | null = null;
jest.mock("../hooks/use-reminder-queries", () => ({
	useReminderQueries: () => mockData,
}));

const mockAddReminder = jest.fn();
const mockEditReminder = jest.fn();
const mockRemoveReminder = jest.fn();
const mockSetEveningReview = jest.fn();
jest.mock("../hooks/use-reminder-actions", () => ({
	useReminderActions: () => ({
		addReminder: mockAddReminder,
		isAdding: false,
		addError: null,
		editReminder: mockEditReminder,
		removeReminder: mockRemoveReminder,
		setEveningReview: mockSetEveningReview,
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
		eveningReviewEnabled: false,
		notificationsDenied: false,
		...overrides,
	};
}

describe("RemindersScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockData = data();
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

	it("toggles one reminder independently", async () => {
		await render(<RemindersScreen habitId={1} />);
		await fireEvent(
			screen.getByLabelText("Reminder at 21:00 on"),
			"valueChange",
			false,
		);
		expect(mockEditReminder).toHaveBeenCalledWith(habit, 2, { enabled: false });
	});

	it("removes a time from its expanded card", async () => {
		await render(<RemindersScreen habitId={1} />);
		await fireEvent.press(screen.getByText("Remove"));
		expect(mockRemoveReminder).toHaveBeenCalledWith(habit, 2);
	});

	it("adds a time, then opens its time picker", async () => {
		// The live query would list the new reminder; here #1 stands in for it.
		mockAddReminder.mockResolvedValue(reminder(1, 9, [1, 2, 3, 4, 5]));
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

	it("has a separate Evening review toggle with no weekday picker", async () => {
		await render(<RemindersScreen habitId={1} />);

		expect(
			screen.getByText("One nudge at 21:30 to log anything you missed."),
		).toBeTruthy();
		await fireEvent(
			screen.getByLabelText("Evening review"),
			"valueChange",
			true,
		);
		expect(mockSetEveningReview).toHaveBeenCalledWith(true);
	});
});
