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

import { useSettingsActions } from "./use-settings-actions";

beforeEach(() => {
	jest.clearAllMocks();
	mockEnsurePermission.mockResolvedValue("granted");
});

describe("useSettingsActions (HAB-15)", () => {
	it("the Evening review toggle asks for permission turning on, not off", async () => {
		const { result } = await renderHook(() => useSettingsActions());

		await act(() => result.current.setEveningReview(true));
		expect(mockEnsurePermission).toHaveBeenCalledTimes(1);
		expect(mockSetEveningReview).toHaveBeenCalledWith(true);

		mockEnsurePermission.mockClear();
		mockSetEveningReview.mockClear();
		await act(() => result.current.setEveningReview(false));
		expect(mockEnsurePermission).not.toHaveBeenCalled();
		expect(mockSetEveningReview).toHaveBeenCalledWith(false);
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
