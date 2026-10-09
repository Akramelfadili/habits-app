import { renderHook } from "@testing-library/react-native";
import { makeExportSource } from "../test-support/export-fixtures";

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
import { useExportQueries, useSettingsQueries } from "./use-settings-queries";

beforeEach(() => {
	mockSettings.clear();
	mockPermission = "granted";
	useThemePreferenceStore.setState({ preference: "system", isLoaded: true });
});

describe("useSettingsQueries (HAB-15)", () => {
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

	it("reports Never until an export has succeeded, then the date", async () => {
		const first = await renderHook(() => useSettingsQueries());
		expect(first.result.current.lastExport).toBe("Never");
		mockSettings.set("habits.lastExport", "2020-01-02");
		const second = await renderHook(() => useSettingsQueries());
		expect(second.result.current.lastExport).toBe("2 January 2020");
	});

	it("exposes the Appearance choice and what it resolves to", async () => {
		useThemePreferenceStore.setState({ preference: "dark" });
		const { result } = await renderHook(() => useSettingsQueries());
		expect(result.current.themePreference).toBe("dark");
		expect(result.current.resolvedScheme).toBe("dark");
	});
});

describe("useExportQueries", () => {
	it("the archived toggle changes the counts the sheet quotes", async () => {
		const withArchived = await renderHook(() =>
			useExportQueries({ format: "csv", includeArchived: true }),
		);
		const without = await renderHook(() =>
			useExportQueries({ format: "csv", includeArchived: false }),
		);
		expect(withArchived.result.current.summary.logs).toBe(4);
		expect(without.result.current.summary.logs).toBe(3);
		expect(without.result.current.summary.archivedHabits).toBe(0);
	});
});
