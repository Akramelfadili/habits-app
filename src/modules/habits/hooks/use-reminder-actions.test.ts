import { act, renderHook } from "@testing-library/react-native";
import { makeHabit } from "../test-support/habit-builder";

const mockEnsurePermission = jest.fn();
jest.mock("@/lib/notifications/use-notification-permission", () => ({
	ensureNotificationPermission: () => mockEnsurePermission(),
}));

const mockAddReminder = jest.fn();
const mockEditReminder = jest.fn();
const mockRemoveReminder = jest.fn();
const mockRestoreReminder = jest.fn();
const mockSetEveningReview = jest.fn();
jest.mock("../services/reminder-service", () => ({
	addReminder: (...args: unknown[]) => mockAddReminder(...args),
	editReminder: (...args: unknown[]) => mockEditReminder(...args),
	removeReminder: (...args: unknown[]) => mockRemoveReminder(...args),
	restoreReminder: (...args: unknown[]) => mockRestoreReminder(...args),
	setEveningReview: (...args: unknown[]) => mockSetEveningReview(...args),
}));

import {
	toggleEveningReview,
	useReminderActions,
} from "./use-reminder-actions";

const habit = makeHabit({ id: 3 });

describe("useReminderActions", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEnsurePermission.mockResolvedValue("granted");
	});

	it("asks for permission before adding a time", async () => {
		const { result } = await renderHook(() => useReminderActions());
		await act(() => result.current.addReminder(habit));

		expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
		expect(mockAddReminder).toHaveBeenCalledWith(habit, undefined);
	});

	it("passes the sheet's time and days through to the service", async () => {
		const { result } = await renderHook(() => useReminderActions());
		await act(() =>
			result.current.addReminder(habit, {
				hour: 18,
				minute: 30,
				weekdays: [6],
			}),
		);
		expect(mockAddReminder).toHaveBeenCalledWith(habit, {
			hour: 18,
			minute: 30,
			weekdays: [6],
		});
	});

	it("restores a removed reminder through the service", async () => {
		const removed = {
			id: 5,
			habitId: 3,
			hour: 8,
			minute: 0,
			weekdays: [1],
			enabled: true,
		} as const;
		const { result } = await renderHook(() => useReminderActions());
		await act(() =>
			result.current.restoreReminder({ ...removed, weekdays: [1] }),
		);
		expect(mockRestoreReminder).toHaveBeenCalledWith(removed);
	});

	it("still saves when permission is denied — settings are never lost", async () => {
		mockEnsurePermission.mockResolvedValue("denied");
		const { result } = await renderHook(() => useReminderActions());
		await act(() => result.current.editReminder(habit, 1, { enabled: true }));

		expect(mockEditReminder).toHaveBeenCalledWith(habit, 1, { enabled: true });
	});

	it("only asks when an edit turns something on", async () => {
		const { result } = await renderHook(() => useReminderActions());
		await act(() => result.current.editReminder(habit, 1, { weekdays: [1] }));
		await act(() => result.current.editReminder(habit, 1, { enabled: false }));

		expect(mockEnsurePermission).not.toHaveBeenCalled();
		expect(mockEditReminder).toHaveBeenCalledTimes(2);
	});

	it("removes through the service", async () => {
		const { result } = await renderHook(() => useReminderActions());
		await act(() => result.current.removeReminder(habit, 2));
		expect(mockRemoveReminder).toHaveBeenCalledWith(habit, 2);
	});

	it("no longer exposes the evening review (HAB-21)", async () => {
		const { result } = await renderHook(() => useReminderActions());
		expect(result.current).not.toHaveProperty("setEveningReview");
	});

	it("still shares toggleEveningReview with Settings: asks before turning on, not off", async () => {
		await act(() => toggleEveningReview(false));
		expect(mockEnsurePermission).not.toHaveBeenCalled();

		await act(() => toggleEveningReview(true));
		expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
		expect(mockSetEveningReview).toHaveBeenLastCalledWith(true);
	});
});
