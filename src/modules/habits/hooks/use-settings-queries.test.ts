import { renderHook } from "@testing-library/react-native";
import { makeExportSource } from "../test-support/export-fixtures";

let mockReminders: { habitId: number; enabled: boolean }[] = [];
jest.mock("../repositories/reminder-repository", () => ({
	useAllReminders: () => mockReminders,
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockSource.frozenDays,
}));
const mockSource = makeExportSource();
jest.mock("../repositories/habit-repository", () => ({
	useHabitsList: () => ({ habits: mockSource.habits, loaded: true }),
}));
jest.mock("../repositories/entry-repository", () => ({
	useAllEntries: () => mockSource.entries,
	useEntryNotes: () => mockSource.notes,
}));

const mockSettings = new Map<string, string>();
jest.mock("@/lib/app-settings/repositories/app-settings-repository", () => ({
	useAppSetting: (key: string) => mockSettings.get(key) ?? null,
}));
let mockPermission: string | undefined = "granted";
jest.mock("@/lib/notifications/use-notification-permission", () => ({
	useNotificationPermission: () => mockPermission,
}));

import { useThemePreferenceStore } from "@/theme/theme-preference-store";
import { useSettingsQueries } from "./use-settings-queries";

beforeEach(() => {
	mockSettings.clear();
	mockPermission = "granted";
	useThemePreferenceStore.setState({ preference: "system", isLoaded: true });
});

describe("useSettingsQueries", () => {
	it("reads the Evening review from the setting Reminders reads", async () => {
		mockSettings.set("habits.eveningReview", "true");
		const { result } = await renderHook(() => useSettingsQueries());
		expect(result.current.eveningReviewEnabled).toBe(true);
	});

	it("flags iOS notifications being off, without touching the toggle's value", async () => {
		mockSettings.set("habits.eveningReview", "true");
		mockPermission = "denied";
		const { result } = await renderHook(() => useSettingsQueries());
		expect(result.current.notificationsDenied).toBe(true);
		expect(result.current.eveningReviewEnabled).toBe(true);
	});

	it("exposes the Appearance choice and what it resolves to", async () => {
		useThemePreferenceStore.setState({ preference: "dark" });
		const { result } = await renderHook(() => useSettingsQueries());
		expect(result.current.themePreference).toBe("dark");
		expect(result.current.resolvedScheme).toBe("dark");
	});
});

describe("useSettingsQueries — notifications (SY6)", () => {
	it("counts what a denied permission holds back: enabled times on active habits (SY6)", async () => {
		mockReminders = [
			{ habitId: 1, enabled: true },
			{ habitId: 1, enabled: true },
			{ habitId: 2, enabled: false },
		];
		mockPermission = "denied";
		const { result } = await renderHook(() => useSettingsQueries());
		expect(result.current.notificationPermission).toBe("denied");
		// The fixture's one active habit has the two enabled times; the off one is not counted.
		expect(result.current.notificationImpact).toEqual({ times: 2, habits: 1 });
	});
});
