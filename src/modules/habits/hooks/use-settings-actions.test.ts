import { act, renderHook } from "@testing-library/react-native";

const mockEnsurePermission = jest.fn();
jest.mock("@/lib/notifications/use-notification-permission", () => ({
	ensureNotificationPermission: () => mockEnsurePermission(),
}));
const mockSetEveningReview = jest.fn();
jest.mock("../services/reminder-service", () => ({
	addReminder: jest.fn(),
	editReminder: jest.fn(),
	removeReminder: jest.fn(),
	setEveningReview: (...args: unknown[]) => mockSetEveningReview(...args),
}));
const mockSetThemePreference = jest.fn();
jest.mock("@/theme/theme-preference", () => ({
	setThemePreference: (...args: unknown[]) => mockSetThemePreference(...args),
}));

import { useReminderActions } from "./use-reminder-actions";
import { useSettingsActions } from "./use-settings-actions";

beforeEach(() => {
	jest.clearAllMocks();
	mockEnsurePermission.mockResolvedValue("granted");
});

describe("useSettingsActions (HAB-15)", () => {
	it("the Evening review toggle does exactly what Reminders' toggle does", async () => {
		const settings = await renderHook(() => useSettingsActions());
		const reminders = await renderHook(() => useReminderActions());

		for (const toggle of [
			settings.result.current.setEveningReview,
			reminders.result.current.setEveningReview,
		]) {
			mockEnsurePermission.mockClear();
			mockSetEveningReview.mockClear();
			await act(() => toggle(true));
			expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
			expect(mockSetEveningReview).toHaveBeenCalledWith(true);

			mockEnsurePermission.mockClear();
			mockSetEveningReview.mockClear();
			await act(() => toggle(false));
			expect(mockEnsurePermission).not.toHaveBeenCalled();
			expect(mockSetEveningReview).toHaveBeenCalledWith(false);
		}
	});

	it("keeps the toggle's setting even when iOS notifications are denied", async () => {
		mockEnsurePermission.mockResolvedValue("denied");
		const { result } = await renderHook(() => useSettingsActions());
		await act(() => result.current.setEveningReview(true));
		expect(mockSetEveningReview).toHaveBeenCalledWith(true);
	});

	it("passes the Appearance choice to the theme store", async () => {
		const { result } = await renderHook(() => useSettingsActions());
		await act(() => result.current.setThemePreference("dark"));
		expect(mockSetThemePreference).toHaveBeenCalledWith("dark");
	});
});
