import { act, renderHook } from "@testing-library/react-native";
import { useToastStore } from "@/store/toast-store";

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

	it("a failing Evening review toggle never rejects: it toasts the failure", async () => {
		useToastStore.setState({ toast: null });
		mockSetEveningReview.mockRejectedValueOnce(new Error("schedule failed"));
		const { result } = await renderHook(() => useSettingsActions());

		const returned = await act(() => result.current.setEveningReview(true));

		expect(returned).toMatchObject({ ok: false });
		expect(useToastStore.getState().toast).toMatchObject({
			message: "Couldn't update the Evening review. Try again.",
			tone: "error",
		});
	});

	it("a failing Appearance save never rejects: it toasts the failure", async () => {
		useToastStore.setState({ toast: null });
		mockSetThemePreference.mockRejectedValueOnce(new Error("db"));
		const { result } = await renderHook(() => useSettingsActions());

		const returned = await act(() => result.current.setThemePreference("dark"));

		expect(returned).toMatchObject({ ok: false });
		expect(useToastStore.getState().toast?.message).toBe(
			"Couldn't save your Appearance choice. Try again.",
		);
	});
});
