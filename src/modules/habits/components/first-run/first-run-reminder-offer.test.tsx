import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";
import { useFirstRunOfferStore } from "../../first-run-offer-store";
import { makeHabit } from "../../test-support/habit-builder";

jest.mock("expo-symbols", () => {
	const { View } = require("react-native");
	return { SymbolView: View };
});

const calls: string[] = [];
let mockPermission = "granted";
let mockFails = false;
jest.mock("../../services/first-run-service", () => ({
	enableFirstHabitReminder: async (habit: { name: string }) => {
		calls.push(`iOS asked after our prompt, then reminder for ${habit.name}`);
		if (mockFails) throw new Error("write failed");
		return mockPermission;
	},
}));

import { FirstRunReminderOffer } from "./first-run-reminder-offer";

beforeEach(() => {
	calls.length = 0;
	mockPermission = "granted";
	mockFails = false;
	useFirstRunOfferStore.getState().clear();
	useToastStore.setState({ toast: null } as never);
});

const offer = () =>
	act(() =>
		useFirstRunOfferStore.getState().offer(makeHabit({ name: "Drink water" })),
	);

describe("FirstRunReminderOffer (FR3)", () => {
	it("shows nothing until a first habit is saved", async () => {
		await render(<FirstRunReminderOffer />);
		expect(screen.queryByText("Remind you each day?")).toBeNull();
	});

	it("explains the 09:00 nudge for the habit before anything is asked of iOS", async () => {
		await render(<FirstRunReminderOffer />);
		await offer();
		expect(screen.getByText("Remind you each day?")).toBeTruthy();
		expect(
			screen.getByText(
				"A nudge at 09:00 to log Drink water. Change the time or turn it off in Reminders.",
			),
		).toBeTruthy();
		expect(calls).toEqual([]);
	});

	it("Allow reminders adds the reminder (which is what raises the iOS prompt) and says it was saved", async () => {
		await render(<FirstRunReminderOffer />);
		await offer();
		await fireEvent.press(screen.getByText("Allow reminders"));

		await waitFor(() => expect(calls).toHaveLength(1));
		expect(useFirstRunOfferStore.getState().habit).toBeNull();
		await waitFor(() =>
			expect(useToastStore.getState().toast?.message).toBe(
				"Reminder saved · 09:00",
			),
		);
	});

	it("says notifications are off when iOS is then refused, and keeps the reminder", async () => {
		mockPermission = "denied";
		await render(<FirstRunReminderOffer />);
		await offer();
		await fireEvent.press(screen.getByText("Allow reminders"));

		await waitFor(() =>
			expect(useToastStore.getState().toast?.message).toBe(
				"Reminder saved, but notifications are off",
			),
		);
		expect(useToastStore.getState().toast?.tone).toBe("warning");
	});

	it("Not now does nothing at all: no reminder, no iOS prompt, no toast", async () => {
		await render(<FirstRunReminderOffer />);
		await offer();
		await fireEvent.press(screen.getByText("Not now"));

		expect(calls).toEqual([]);
		expect(useFirstRunOfferStore.getState().habit).toBeNull();
		expect(useToastStore.getState().toast).toBeNull();
		expect(screen.queryByText("Remind you each day?")).toBeNull();
	});

	it("a failed reminder write is an error toast and the question is gone", async () => {
		mockFails = true;
		await render(<FirstRunReminderOffer />);
		await offer();
		await fireEvent.press(screen.getByText("Allow reminders"));

		await waitFor(() =>
			expect(useToastStore.getState().toast?.tone).toBe("error"),
		);
		expect(useFirstRunOfferStore.getState().habit).toBeNull();
	});
});
